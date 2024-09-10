# Slow Reader API

Types and constants shared between clients and server.

## Subprotocol Version

“Subprotocol” is a client-server API both Logux and HTTP. The term has “sub” because it is inside [Logux sync protocol](https://logux.org/protocols/ws/spec/).

Every time we have client-server API changes, we need to update subprotocol version to be able to handle old clients. For instance, mobile app could take months for update.

Server can ask users to update client app if version is too old. Or we can add different handler for old clients.

## Logux Actions

We define [Logux actions](https://logux.org/guide/concepts/action/) types and action creators here to be sure, that client and server have the same types.

## HTTP API

For every [HTTP endpoint](./http/) we define here:
- URL params and HTTP body types.
- `fetch()` wrapper to use in client checking all types.
- Endpoint definition to use in [server helper](../server/lib/http.ts).

It allows us to verify that client and server API is compatible.
