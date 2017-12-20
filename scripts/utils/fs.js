import fs from 'fs';
import mkdirpFn from 'mkdirp';

function promsify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
}

export const readFile = promsify(fs.readFile);
export const writeFile = promsify(fs.writeFile);

export const mkdirp = promsify(mkdirpFn);
