# serverless-config-merge

An opinionated command-line utility to merge [Serverless Framework][sls]
configuration files. Move common configuration into smaller, maintainable
individual files and import them prior to deployment.

```yaml
service: example-service

provider:
  $<<: ${file(provider-defaults.yml)}
  region: eu-west-1
```

## Installation

Install as a dev dependency to your Serverless Framework project with npm. This
is preferred to a global install to allow you to have control over the version
of the tool on a per-project basis.

```sh
npm install --save-dev @orangejellyfish/serverless-config-merge
```

## Usage

Move common configuration into YAML files. For example, a common "provider"
config might include the provider name and region in `provider-defaults.yml`:

```yaml
name: aws
region: eu-west-1
```

Reference a file with a special key. The key is `$<<` by default, inspired by
the [YAML merge key proposal][prop]. The value must be a Serverless Framework
"file" variable, or an array of them. If a key appears in a file that is merged
in and also in the source, the value in the source takes precedence:

```yaml
service: example-service

provider:
  $<<: ${file(provider-defaults.yml)} # Merge in the defaults
  region: eu-west-2 # Override the default from the merged file

plugins:
  $<<:
    - ${file(plugin-defaults-1.yml)} # Merge in multiple files
    - ${file(plugin-defaults-2.yml)}
```

Run `serverless-config-merge` (or the alias `sls-config-merge`) prior to your
deployment. For example:

```sh
MERGED_CONFIG_FILE=serverless-merged.yml
npx serverless-config-merge -o $MERGED_CONFIG_FILE
sls deploy --config $MERGED_CONFIG_FILE
rm $MERGED_CONFIG_FILE
```

### Options

- `-i` - input file, defaults to `serverless.yml`
- `-o` - output file, defaults to `serverless-merge.yml`
- `-k` - merge key, defaults to `$<<`

## Design choices

- Designed as a standalone executable to run prior to deployment because the
  Severless Framework plugin system does not provide an early enough hook to
  merge all relevant properties. For example, the
  [serverless-merge-config][smc] plugin is unable to merge the `provider.name`
  property because it's presence is validated by the framework too early.

- Writes a new config file alongside your existing Serverless Framework config
  file. It would have been preferable to write this file to a hidden directory
  such as `.serverless` but that would require rewriting any other paths in the
  file. As it stands, you'll have to add this file to `.gitignore` or delete it
  post-deployment, as shown in the example above.

- The new config file is written as JSON rather than YAML, simply because the
  Serverless Framework supports both and since the output is already a
  JavaScript object it's slightly easier to output it as JSON.

- Only supports Serverless Framework configuration files written in YAML. If
  your configuration file is written in JSON you can use the same idea with
  minor tweaks - pull requests welcome!

[sls]: https://www.serverless.com/framework
[prop]: https://yaml.org/type/merge.html
[smc]: https://github.com/CruGlobal/serverless-merge-config
