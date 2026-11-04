# Metrics

Self-hosters can read usage metrics in Prometheus format by `GET /metrics` with `ANALYTICS_TOKEN`. It replaces `GET /analytics`, and `ANALYTICS_IPS` was removed. Old daily statistics are removed from the database.
