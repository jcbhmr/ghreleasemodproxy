//go:build !lambda

package main

import (
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
)

type Port uint16

func ParsePort(s string) (Port, error) {
	p, err := strconv.ParseUint(s, 10, 16)
	if err != nil {
		return 0, err
	}
	return Port(p), nil
}

type PortFlag Port

func (v *PortFlag) Set(s string) error {
	p, err := ParsePort(s)
	if err != nil {
		return err
	}
	*v = PortFlag(p)
	return nil
}
func (v PortFlag) String() string {
	return strconv.Itoa(int(v))
}

var port Port

func init() {
	flag.Var((*PortFlag)(&port), "port", "port to listen on")
}

func Parse() {
	if portEnv, ok := os.LookupEnv("PORT"); ok {
		port, _ = ParsePort(portEnv)
	}
	flag.Parse()
}

func main() {
	Parse()

	listener, err := net.Listen("tcp", net.JoinHostPort("", strconv.Itoa(int(port))))
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Listening on %s", listener.Addr())
	log.Fatal(http.Serve(listener, &ghreleasemodproxy.Handler{}))
}
