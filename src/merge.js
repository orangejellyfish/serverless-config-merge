#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const parseArgs = require('minimist');
const { CLOUDFORMATION_SCHEMA } = require('js-yaml-cloudformation-schema');

// Regular expression to match Serverless Framework "file" variable references
// of the pattern:
//
// ${file(../../path):key}
//
// Where "path" is a filesystem path at which a YAML file can be found and "key"
// is an optional key to reference in the parsed contents of that file.
const FILE_VAR_REGEX = /\$\{file\((?<path>[^)]+)\):?(?<key>[^}]+)?}$/;

// Grab the input file name, output file name and the merge key from the command
// line args.
const argv = parseArgs(process.argv);
const inp = argv.i || 'serverless.yml';
const out = argv.o || 'serverless-merged.json';
const key = argv.k || '$<<';

// Given a YAML file (as a Serverless Framework "file" variable reference
// string), load it, parse it to JSON and merge the result object into the
// provided object.
//
// TODO: It is possible to reference JSON files with the Serverless Framework
// file variable syntax. The framework determines how to parse the file based
// on extension and this should be updated to do the same.
//
function merge(obj, file, relativeTo = "") {
  const match = file.match(FILE_VAR_REGEX);

  // Assume the loaded file is a YAML file, parse it as such and merge it into
  // the original object.
  if (match?.groups?.path) {
    const sourcePath = path.resolve(relativeTo, match.groups.path);
    const source = fs.readFileSync(sourcePath, { encoding: 'utf8' });
    const parsed = yaml.load(source, { schema: CLOUDFORMATION_SCHEMA });
    const value = match?.groups?.key ? parsed[match.groups.key] : parsed;

    delete obj[key];
    Object.entries(value).forEach(([k2, v2]) => {
      // If the key already exists on the source object the existing value takes
      // precedence.
      if (obj[k2] === undefined) {
        obj[k2] = v2;
      }
    });
  }
}

// Recursively search the provided object for keys of the given name. We expect
// such keys to have a value matching the Serverless Framework "file" variable
// reference pattern defined above. When a matching key is found we load the
// file at the path indicated by the value, parse it as YAML and merge the
// resulting object into the parent.
//
// TODO: Detect circular references to avoid infinite recursion.
//
function walk(key, obj, relativeTo) {
  Object.entries(obj).forEach(([k, v]) => {
    // If the key matches the search term we perform a merge. If the value is a
    // string it should match the Serverless Framework "file" variable pattern
    // and if it's an array each element should match.
    if (k === key) {
      if (Array.isArray(v)) {
        v.forEach((str) => void merge(obj, str, relativeTo));
      } else {
        merge(obj, v, relativeTo);
      }
    } else if (v && typeof v === 'object') {
      walk(key, v, relativeTo);
    }
  });
}

// Load the input file and parse it with a schema that allows the use of
// intrinsic CloudFormation functions (such as "!Ref") that are otherwise
// invalid YAML, and run the merge on the resulting object.
const source = fs.readFileSync(inp, { encoding: 'utf8' });
const parsed = yaml.load(source, { schema: CLOUDFORMATION_SCHEMA });
const { dir: relativeTo } = path.parse(inp);

walk(key, parsed, relativeTo);
fs.writeFileSync(out, JSON.stringify(parsed));
