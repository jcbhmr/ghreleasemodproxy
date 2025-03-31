//go:build !netlify

package main

import (
	"log"
	"net/http"
)

func start(handler http.Handler) {
	log.Fatal(http.ListenAndServe(":8080", handler))
}
