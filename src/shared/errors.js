class ApplicationUsageError extends Error {
    constructor(message) {
      super(message); // (1)
      console.log('this -> ', this);
      this.name = "ApplicationUsageError"; // (2)
    }
  }


  module.exports.ApplicationUsageError = ApplicationUsageError