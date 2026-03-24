FROM golang:1.26

WORKDIR /app

COPY go.mod ./
COPY main.go ./

RUN go build -o core-service .

EXPOSE 8080

CMD ["./core-service"]