import { IndexedStore } from '@logux/client'
import { setLogStore } from '@slowreader/core'

setLogStore(() => new IndexedStore())
