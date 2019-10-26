// @remove-file-on-eject
/**
 * Copyright (c) 2019-present Max Parelius
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const execSync = require('child_process').execSync;
const chalk = require('@rapido/dev-utils/chalk');
const spawn = require('@rapido/dev-utils/crossSpawn');
const sortPackageJson = require('@rapido/dev-utils/sortPackageJson');
const { defaultBrowsers } = require('@rapido/dev-utils/browsersHelper');

const verifyTypeScriptSetup = require('../config/verifyTypeScriptSetup');

function isInGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function isInMercurialRepository() {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function tryGitInit(appPath) {
  let didInit = false;
  try {
    execSync('git --version', { stdio: 'ignore' });
    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync('git init', { stdio: 'ignore' });
    didInit = true;

    execSync('git add -A', { stdio: 'ignore' });
    execSync('git commit -m "Initial commit from Rapido"', {
      stdio: 'ignore',
    });
    return true;
  } catch (e) {
    if (didInit) {
      // If we successfully initialized but couldn't commit,
      // maybe the commit author config is not set.
      // In the future, we might supply our own committer
      // like Ember CLI does, but for now, let's just
      // remove the Git files to avoid a half-done state.
      try {
        // unlinkSync() doesn't work on directories.
        fs.removeSync(path.join(appPath, '.git'));
      } catch (removeErr) {
        // Ignore.
      }
    }
    return false;
  }
}

function walk(dir, exclude, done) {
  var folders = [];
  var files = [];

  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }

    var pending = list.length;
    if (!pending) {
      return done(null, folders, files);
    }
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      if (!exclude.includes(file)) {
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            folders.push(file);
            walk(file, exclude, function(err, resFolders, resFiles) {
              folders = folders.concat(resFolders);
              files = files.concat(resFiles);
              if (!--pending) {
                done(null, folders, files);
              }
            });
          } else {
            files.push(file);
            if (!--pending) {
              done(null, folders, files);
            }
          }
        });
      } else if (!--pending) {
        done(null, folders, files);
      }
    });
  });
}

function filterContent(content, key, useKey) {
  let filteredContent = content;
  let regex = new RegExp(`// @remove-file-if-no-${key}`);
  if (!useKey && content.match(regex)) {
    return '';
  }
  regex = new RegExp(`// @remove-file-if-${key}`);
  if (useKey && content.match(regex)) {
    return '';
  }
  regex = RegExp(
    `\\/\\/ @remove-if-no-${key}-begin\\n?([\\s\\S]*?)\\/\\/ @remove-if-no-${key}-end\\n?`,
    'gm'
  );
  filteredContent = filteredContent.replace(regex, useKey ? '$1' : '');
  regex = RegExp(
    `\\/\\/ @remove-if-${key}-begin\\n?([\\s\\S]*?)\\/\\/ @remove-if-${key}-end\\n?`,
    'gm'
  );
  filteredContent =
    filteredContent.replace(regex, useKey ? '' : '$1').trim() + '\n';
  return filteredContent;
}

module.exports = function(
  appPath,
  appName,
  verbose,
  originalDirectory,
  useTypeScript,
  usePrettier,
  useComponents,
  useEnv,
  useSession,
  useUtils
) {
  const ownPath = path.dirname(
    require.resolve(path.join(__dirname, '..', 'package.json'))
  );
  const appPackage = require(path.join(appPath, 'package.json'));
  const useYarn = fs.existsSync(path.join(appPath, 'yarn.lock'));

  // Copy over some of the devDependencies
  appPackage.dependencies = appPackage.dependencies || {};

  // Set main script
  appPackage.main = 'node_modules/expo/AppEntry.js';

  // Setup the script rules
  appPackage.scripts = {
    start: 'rapido start',
    build: 'rapido build',
    test: 'rapido test',
    eject: 'rapido eject',
    lint: 'rapido lint',
  };

  if (useTypeScript) {
    appPackage.scripts.tsc = 'tsc --noEmit';
  }

  if (usePrettier) {
    appPackage.scripts.format = `prettier --trailing-comma es5 --single-quote --write '**/*.{js,jsx,ts,tsx,json,css,scss,md}'`;
    appPackage.husky = {
      hooks: {
        'pre-commit': 'lint-staged',
      },
    };
    appPackage['lint-staged'] = {
      '*.{js,jsx,ts,tsx,json,css,scss,md}': [
        'prettier --trailing-comma es5 --single-quote --write',
        'git add',
      ],
    };
    appPackage.prettier = {
      singleQuote: true,
      trailingComma: 'es5',
    };
  }

  // Setup the eslint config
  appPackage.eslintConfig = {
    extends: 'react-app',
  };

  // Setup the browsers list
  appPackage.browserslist = defaultBrowsers;

  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(sortPackageJson(appPackage), null, 2) + os.EOL
  );

  const readmeExists = fs.existsSync(path.join(appPath, 'README.md'));
  if (readmeExists) {
    fs.renameSync(
      path.join(appPath, 'README.md'),
      path.join(appPath, 'README.old.md')
    );
  }

  // Copy the files with assets for the user
  const templatePath = path.join(
    ownPath,
    useTypeScript ? 'template-typescript' : 'template'
  );

  const assetsPath = path.resolve(templatePath, 'assets');
  if (fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath.replace(templatePath, appPath));
    fs.copySync(assetsPath, assetsPath.replace(templatePath, appPath));
  }

  const webPath = path.resolve(templatePath, 'web');
  if (fs.existsSync(webPath)) {
    fs.mkdirSync(webPath.replace(templatePath, appPath));
    fs.copySync(webPath, webPath.replace(templatePath, appPath));
  }

  function verifyAbsent(file) {
    if (fs.existsSync(path.join(appPath, file.replace(templatePath, '')))) {
      console.error(
        `\`${file.replace(
          templatePath,
          ''
        )}\` already exists in your app folder. We cannot ` +
          'continue as you would lose all the changes in that file or directory. ' +
          'Please move or delete it (maybe make a copy for backup) and run this ' +
          'command again.'
      );
      process.exit(1);
    }
  }

  if (fs.existsSync(templatePath)) {
    walk(templatePath, [assetsPath, webPath], function(err, folders, files) {
      if (err) {
        console.error(
          `Could not read template directory: ${chalk.green(templatePath)}`
        );
        return;
      }

      // Ensure that the app folder is clean and we won't override any files
      folders.forEach(verifyAbsent);
      files.forEach(verifyAbsent);

      folders.forEach(folder => {
        fs.mkdirSync(folder.replace(templatePath, appPath));
      });

      files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        content = filterContent(content, 'components', useComponents);
        content = filterContent(content, 'env', useEnv);
        content = filterContent(content, 'session', useSession);
        content = filterContent(content, 'utils', useUtils);
        if (!content) {
          return;
        }
        fs.writeFileSync(file.replace(templatePath, appPath), content);
      });

      // modifies README.md commands based on user used package manager.
      if (useYarn) {
        try {
          const readme = fs.readFileSync(
            path.join(appPath, 'README.md'),
            'utf8'
          );
          fs.writeFileSync(
            path.join(appPath, 'README.md'),
            readme
              .replace(/npm start/g, 'yarn start')
              .replace(/npm test/g, 'yarn test')
              .replace(/npm run build/g, 'yarn build')
              .replace(/npm run eject/g, 'yarn eject'),
            'utf8'
          );
        } catch (err) {
          // Silencing the error. As it fall backs to using default npm commands.
        }
      }

      // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
      // See: https://github.com/npm/npm/issues/1862
      try {
        fs.moveSync(
          path.join(appPath, 'gitignore'),
          path.join(appPath, '.gitignore'),
          []
        );
      } catch (err) {
        // Append if there's already a `.gitignore` file there
        if (err.code === 'EEXIST') {
          const data = fs.readFileSync(path.join(appPath, 'gitignore'));
          fs.appendFileSync(path.join(appPath, '.gitignore'), data);
          fs.unlinkSync(path.join(appPath, 'gitignore'));
        } else {
          throw err;
        }
      }

      let command;
      let args;

      if (useYarn) {
        command = 'yarnpkg';
        args = ['add'];
      } else {
        command = 'npm';
        args = ['install', '--save', verbose && '--verbose'].filter(e => e);
      }

      // Install additional template dependencies, if present
      const templateDependenciesPath = path.join(appPath, 'dependencies.json');
      if (fs.existsSync(templateDependenciesPath)) {
        const templateDependencies = require(templateDependenciesPath);
        [
          { key: 'default', useKey: true },
          { key: 'prettier', useKey: usePrettier },
          { key: 'components', useKey: useComponents },
          { key: 'env', useKey: useEnv },
          { key: 'session', useKey: useSession },
          { key: 'utils', useKey: useUtils },
        ].forEach(({ key, useKey }) => {
          if (useKey && templateDependencies[key]) {
            args = args.concat(
              Object.keys(templateDependencies[key]).map(pkg => {
                const version = templateDependencies[key][pkg];
                return version ? `${pkg}@${version}` : pkg;
              })
            );
          }
        });

        fs.unlinkSync(templateDependenciesPath);
      }

      console.log(`Installing dependencies using ${command}...`);
      console.log();

      const proc = spawn.sync(command, args, { stdio: 'inherit' });
      if (proc.status !== 0) {
        console.error(`\`${command} ${args.join(' ')}\` failed`);
        return;
      }

      if (useTypeScript) {
        verifyTypeScriptSetup();
      }

      if (usePrettier) {
        const prettierCmd = path.resolve(appPath, 'node_modules/.bin/prettier');
        const prettierArgs = [
          '--trailing-comma',
          'es5',
          '--single-quote',
          '--write',
          `${appPath}**/*.{js,jsx,ts,tsx,json,css,scss,md}`,
        ];
        const prettierProc = spawn.sync(prettierCmd, prettierArgs, {
          stdio: 'inherit',
        });
        if (prettierProc.status !== 0) {
          console.error(`\`${command} ${args.join(' ')}\` failed`);
          return;
        }
      }

      if (tryGitInit(appPath)) {
        console.log();
        console.log('Initialized a git repository.');
      }

      // Display the most elegant way to cd.
      // This needs to handle an undefined originalDirectory for
      // backward compatibility with old global-cli's.
      let cdpath;
      if (
        originalDirectory &&
        path.join(originalDirectory, appName) === appPath
      ) {
        cdpath = appName;
      } else {
        cdpath = appPath;
      }

      // Change displayed command to yarn instead of yarnpkg
      const displayedCommand = useYarn ? 'yarn' : 'npm';

      console.log();
      console.log(`Success! Created ${appName} at ${appPath}`);
      console.log('Inside that directory, you can run several commands:');
      console.log();
      console.log(chalk.cyan(`  ${displayedCommand} start`));
      console.log('    Starts the development server.');
      console.log();
      console.log(
        chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}build`)
      );
      console.log('    Bundles the app into static files for production.');
      console.log();
      console.log(chalk.cyan(`  ${displayedCommand} test`));
      console.log('    Starts the test runner.');
      console.log();
      console.log(
        chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}eject`)
      );
      console.log(
        '    Removes this tool and copies build dependencies, configuration files'
      );
      console.log(
        '    and scripts into the app directory. If you do this, you can’t go back!'
      );
      console.log();
      console.log('We suggest that you begin by typing:');
      console.log();
      console.log(chalk.cyan('  cd'), cdpath);
      console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
      if (readmeExists) {
        console.log();
        console.log(
          chalk.yellow(
            'You had a `README.md` file, we renamed it to `README.old.md`'
          )
        );
      }
      console.log();
      console.log('Happy hacking!');
    });
  } else {
    console.error(
      `Could not locate supplied template: ${chalk.green(templatePath)}`
    );
    return;
  }
};
