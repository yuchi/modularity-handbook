const glob = require('glob');

module.exports = function globAsync(...args) {
  return new Promise((resolve, reject) => {
    glob(...args, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
};
