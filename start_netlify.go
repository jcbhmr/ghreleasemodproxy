//go:build netlify

package main

import (
	"net/http"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

func start(handler http.Handler) {
	lambda.Start(httpadapter.New(handler).ProxyWithContext)
}
