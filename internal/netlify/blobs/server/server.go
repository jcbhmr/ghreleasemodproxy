package server

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
)

var apiURLPath = regexp.MustCompile(`/api/v1/blobs/(?<site_id>[^/]+)/(?<store_name>[^/]+)/?(?<key>[^?]*)`)
var legacyAPIURLPath = regexp.MustCompile(`/api/v1/sites/(?<site_id>[^/]+)/blobs/?(?<key>[^?]*)`)

const legacyDefaultStore = "production"
const regionPrefix = "region:"

type Operation string

const (
	OperationDelete      Operation = "delete"
	OperationGet         Operation = "get"
	OperationGetMetadata Operation = "getMetadata"
	OperationList        Operation = "list"
	OperationSet         Operation = "set"
)

type OnRequestCallback func(parameters struct {
	Type Operation
	URL  string
})

type BlobsServerOptions struct {
	Debug     *bool
	Directory string
	Logger    func(msg string)
	OnRequest OnRequestCallback
	Port      *uint16
	Token     *string
}

type BlobsServer struct {
	address   string
	debug     bool
	directory string
	logger    func(msg string)
	onRequest OnRequestCallback
	port      uint16
	server    *http.Server
	token     *string
	tokenHash string
}

func NewBlobsServer(options BlobsServerOptions) *BlobsServer {
	address := ""
	debug := false
	if options.Debug != nil {
		debug = *options.Debug
	}
	directory := options.Directory
	logger := options.Logger
	if logger == nil {
		logger = func(msg string) {
			log.Print(msg)
		}
	}
	onRequest := options.OnRequest
	port := uint16(0)
	if options.Port != nil {
		port = *options.Port
	}
	token := options.Token
	key := make([]byte, 32)
	rand.Read(key)
	mac := hmac.New(sha256.New, key)
	if token != nil {
		mac.Write([]byte(*token))
	} else {
		r := make([]byte, 32)
		rand.Read(r)
		mac.Write(r)
	}
	tokenHash := hex.EncodeToString(mac.Sum(nil))
	return &BlobsServer{
		address:   address,
		debug:     debug,
		directory: directory,
		logger:    logger,
		onRequest: onRequest,
		port:      port,
		token:     token,
		tokenHash: tokenHash,
	}
}

func (b *BlobsServer) dispatchOnRequestEvent(type_ Operation, urlRaw any) {
	if b.onRequest == nil {
		return
	}

	var urlPath string
	switch v := urlRaw.(type) {
	case string:
		urlPath = v
	case *url.URL:
		urlPath = v.Path
		if v.RawQuery != "" {
			urlPath += "?" + v.RawQuery
		}
	default:
		panic("unexpected type")
	}

	b.onRequest(struct {
		Type Operation
		URL  string
	}{Type: type_, URL: urlPath})
}

func (b *BlobsServer) LogDebug(message string) {
	if !b.debug {
		return
	}

	b.logger(message)
}

func (b *BlobsServer) Delete(w http.ResponseWriter, r *http.Request) {
	apiMatch := b.parseAPIRequest(r)

	if apiMatch != nil && apiMatch.UseSignedURL {
		body, err := json.Marshal(map[string]any{
			"url": apiMatch.URL.String(),
		})
		if err != nil {
			panic(err)
		}
		b.sendResponse(w, r, 200, body)
		return
	}

	var rawURL string
	if apiMatch != nil && apiMatch.URL != nil {
		rawURL = apiMatch.URL.String()
	} else if r.URL != nil {
		rawURL = r.URL.String()
	} else {
		rawURL = ""
	}
	addressParsed, err := url.Parse(b.address)
	if err != nil {
		panic(err)
	}
	urlVar, err := url.Parse(rawURL)
	if err != nil {
		panic(err)
	}
	urlVar = addressParsed.ResolveReference(urlVar)
	localPaths := b.getLocalPaths(urlVar)
	dataPath := localPaths.DataPath
	key := localPaths.Key
	metadataPath := localPaths.MetadataPath

	if !dataPath || !key {
		b.sendResponse(w, r, 400, nil)
		return
	}

	_ = os.RemoveAll(metadataPath)

	err = os.RemoveAll(dataPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			// Ignore.
		} else {
			b.sendResponse(w, r, 500, nil)
			return
		}
	}

	b.sendResponse(w, r, 204, nil)
}

func (b *BlobsServer) Start() struct {
	Address string
	Family  string
	Port    uint16
} {
	err := os.MkdirAll(b.directory, 0755)
	if err != nil {
		panic(err)
	}

	b.server = &http.Server{
		Addr:    net.JoinHostPort("", strconv.Itoa(int(b.port))),
		Handler: http.HandlerFunc(b.handleRequest),
	}

	listener, err := net.Listen("tcp", b.server.Addr)
	if err != nil {
		panic(err)
	}
	address := listener.Addr()
	if address == nil {
		panic(errors.New("server address is nil"))
	}
	tcpAddress, ok := address.(*net.TCPAddr)
	if !ok {
		panic(errors.New("server cannot be started on a pipe or Unix socket"))
	}
	b.address = fmt.Sprintf("http://localhost:%d", tcpAddress.Port)

	go func() {
		err := b.server.Serve(listener)
		if err != nil {
			if errors.Is(err, http.ErrServerClosed) {
				// Ignore.
			} else {
				log.Fatal(err)
			}
		}
	}()

	var family string
	if tcpAddress.IP.To4() != nil {
		family = "IPv4"
	} else if tcpAddress.IP.To16() != nil {
		family = "IPv6"
	} else {
		family = "unknown"
	}
	return struct {
		Address string
		Family  string
		Port    uint16
	}{
		Address: tcpAddress.IP.String(),
		Family:  family,
		Port:    uint16(tcpAddress.Port),
	}
}

func (b *BlobsServer) Stop() {
	if b.server == nil {
		return
	}

	b.server.Shutdown(context.Background())
}
