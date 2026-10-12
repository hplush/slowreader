resource "scaleway_vpc" "main" {
  name = "slowreader"
}

resource "scaleway_vpc_private_network" "main" {
  name   = "slowreader"
  vpc_id = scaleway_vpc.main.id
}
