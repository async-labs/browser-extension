const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

const execCommand = (command, ignoreError) => {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1000 }, (error, stdout, stderr) => {
      if (error !== null) {
        if (ignoreError) {
          return resolve('done');
        }

        return reject(error);
      }

      console.log(stdout);
      console.log(stderr);

      return resolve('done');
    });
  });
};

async function copyDir(src, dest) {
  try {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    await fs.promises.mkdir(dest);
    for (let entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  } catch (e) {
    console.log(e);
  }
}
async function copyFile(src, dest) {
  try {
    await fs.promises.copyFile(src, dest);
  } catch (e) {}
}

async function main() {
  try {
    await execCommand('rm -rf aicruiter');
  } catch (e) {}

  try {
    await execCommand('rm aicruiter.zip');
  } catch (e) {}

  await execCommand('mkdir aicruiter');

  const dest = 'aicruiter';

  const files = [
    'manifest.json',

    'popup.html',
    'options.html',

    'jquery.js',

    'bootstrap.min.css',
    'content.css',

    'check.png',
    'icon16-loading.png',
    'icon16.png',
    'icon48.png',
    'icon128.png',
    'loader.gif',
    'remove.png',
  ];

  for (const file of files) {
    await copyFile(file, `${dest}/${file}`);
  }

  await copyDir(`dist`, `${dest}/dist`);

  await execCommand('zip -r aicruiter.zip aicruiter');
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.log(e);
  });
