class CustomError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class LoaderNotFoundError extends CustomError {
  constructor(feedTitle: string) {
    super(`Loader not found for feed ${feedTitle}.`)
  }
}

export class UnsupportedFileExtError extends CustomError {
  constructor(path: string) {
    super(`Unsupported file extension found on ${path}.`)
  }
}
