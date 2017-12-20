import path from 'path';
import graymatter from 'gray-matter';
import { Parser, HtmlRenderer } from 'commonmark';
import pug from 'pug';
import _ from 'lodash';

import { readFile, writeFile, mkdirp } from './utils/fs';
import glob from './utils/glob';

const reader = new Parser();
const writer = new HtmlRenderer();

main().then(console.log, console.error);

async function main() {
  const objects = await transformAll('{concepts,platforms}/**.md');

  const objectsById = _.keyBy(objects, 'id');
  const implementedById = groupByMulti(objects, 'data.implements');
  const definedById = groupByMulti(objects, 'data.defines');

  const availablePlatforms = _.chain(objects)
    .map('data.platforms')
    .flatten()
    .uniq()
    .sort()
    .value();

  const availableImplemented = _.chain(objects)
    .map('data.implements')
    .flatten()
    .uniq()
    .sort()
    .value();

  const common = {
    _,
    availableImplemented,
    availablePlatforms,
    definedById,
    implementedById,
    objectsById,
    get(id) {
      if (id in objectsById) {
        return objectsById[id];
      } else {
        console.warn('Missing id %s', id);
      }
    },
    getAll(ids) {
      return ids.map(common.get).filter(Boolean);
    },
    getURL(id) {
      const object = objectsById[id];

      if (object != null) {
        return `/${object.section}/${object.id}.html`;
      } else {
        return `javascript:missing;`;
      }
    }
  };

  const pageTemplate = pug.compileFile(
    path.resolve(__dirname, '../templates/page.pug')
  );

  const indexTemplate = pug.compileFile(
    path.resolve(__dirname, '../templates/index.pug')
  );

  const distDirname = path.resolve('dist');

  await Promise.all(
    objects.map(async obj => {
      const implementedBy = implementedById[obj.id] || [];
      const definedBy = definedById[obj.id] || [];
      const platforms = common.getAll(obj.data.platforms);

      const locals = Object.assign(
        { definedBy, implementedBy, platforms },
        common,
        obj.data,
        obj
      );

      const result = pageTemplate(locals);

      const sectionDirname = path.resolve(distDirname, obj.section);
      const distFileName = path.resolve(sectionDirname, obj.id + '.html');

      await mkdirp(sectionDirname);
      await writeFile(distFileName, result, 'utf8');
    })
  );

  const indexFilename = path.resolve(distDirname, 'index.html');

  const locals = Object.assign({ objects }, common);

  await writeFile(indexFilename, indexTemplate(locals), 'utf8');
}

async function transformAll(pattern) {
  const files = await glob(pattern);

  return Promise.all(files.map(transformFile));
}

async function transformFile(filename) {
  const section = path.dirname(filename);
  const content = await readFile(filename, 'utf8');
  const info = graymatter(content);
  const id = getId(filename);
  const ast = reader.parse(info.content);
  const html = writer.render(ast);
  const data = fixData(info.data);

  return Object.assign({}, info, { id, section, html, data });
}

function fixData(data) {
  return Object.assign({}, data, {
    platforms: toArray(data.platforms),
    defines: toArray(data.defines),
    implements: toArray(data.implements)
  });
}

function groupByMulti(list, prop) {
  return _.reduce(
    list,
    (acc, item) => {
      _.get(item, prop).forEach(impl => {
        acc[impl] = (acc[impl] || []).concat(item);
      });
      return acc;
    },
    {}
  );
}

function toArray(field) {
  if (field === '' || field == null) {
    return [];
  } else if (Array.isArray(field)) {
    return field;
  } else {
    return [field];
  }
}

function getId(filename) {
  return path
    .basename(filename)
    .split('.')
    .slice(0, -1)
    .join('.');
}
