class ApplicationUsageError extends Error {
    constructor(message) {
      super(message); // (1)
      this.name = "ApplicationUsageError"; // (2)
    }
  }


  module.exports.ApplicationUsageError = ApplicationUsageError