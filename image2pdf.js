const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const log = console.log;
const Canvas = require('canvas');

const rFileName = /([^<>/\\\|:""\*\?]+)\.\w+$/; // 取出不带后缀的文件名
const rFileFormat = /[^<>/\\\|:""\*\?]+\.(\w+)$/; // 取出文件的后缀


const ignore = ['node_modules']; // 遍历过程中需要忽略的目录

const format = ['png', 'jpg', 'jpeg']; // 需要转换的文件后缀


const source = process.argv[2] || './'; // 目标路径
const replace = process.argv[3] || false; // 是否跟源文件同路径
const output = path.join(source, '/output/'); // 如果不跟源文件同路径，则集中输出到output下

/*遍历路径，输出该路径下所有的文件的地址*/
const walkDir = (dir, filter) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                log(chalk.red(err));
                reject(err);
            } else {
                let results = [];
                files.forEach((file, i) => {
                    if ((filter && filter(file)) || true) {
                        results.push(path.join(dir + '/' + file));
                    }
                })
                resolve(results);
            }
        });
    });
};

/*判断当前路径是文件还是目录*/
const isDirOrFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.stat(path, function (err, stats) {　　
            if (err) {
                log(chalk.red(err));　　　　
                reject(err);　　
            } else {
                resolve({
                    isFile: stats.isFile(),
                    isDir: stats.isDirectory()
                });
            }

        });
    })
}


/**
 * 开始处理需要转换的路径
 * 遍历该路径下的所有目标文件
 * @param {*} dir
 */
async function startConvert(dir) {

    var files = await walkDir(dir, (file) => {
        ignore.indexOf(file) === -1
    });

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let fInfo = await isDirOrFile(file);
        if (fInfo.isDir) {
            startConvert(file);
        } else {
            match = rFileFormat.exec(file);
            if (format.indexOf(match ? match[1] : '') > -1) {
                img2pdf(file);
            }
        }
    }
}


/**
 * 清空目录
 * @param {*} dir  目标路径
 * @param {*} root 是否删除目录本身 true: 删除;  false: 保留
 */
async function emptyDir(dir, root) {
    let files = await walkDir(dir);

    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        let fInfo = await isDirOrFile(f);
        if (fInfo.isDir) {
            emptyDir(file, true);
        } else {
            await deleteFile(f);
        }
    }
    if (root) {
        await deleteDir(dir);
    }
}

/*删除文件*/
async function deleteFile(file) {
    var r = await exist(file);
    return new Promise((resolve, reject) => {
        if (r) {
            fs.unlink(file, (err) => {
                if (err) {
                    log(chalk.red(err));
                    reject(err)
                } else {
                    resolve(true);
                }
            });
        } else {
            resolve(true);
        }
    })
}

/*删除目录*/
async function deleteDir(dir) {
    var r = await exist(dir);
    return new Promise((resolve, reject) => {
        if (r) {
            fs.rmdir(dir, (err) => {
                if (err) {
                    log(chalk.red(err));
                    reject(err)
                } else {
                    resolve(true);
                }
            });
        } else {
            resolve(true);
        }
    })
}

const exist = (file) => {
    return new Promise((resolve, reject) => {
        fs.exists(file, (result) => {
            resolve(result);
        });
    })
}



/**
 *将目标文件转成pdf
 *
 * @param {*} file
 */
function img2pdf(file) {
    let img = new Canvas.Image;
    fs.readFile(file, (err, data) => {
        if (err) {
            log(chalk.red(err));
            return false;
        }
        img.src = data;

        let canvas = new Canvas(img.width, img.height, 'pdf');
        let ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, img.width, img.height);

        fs.writeFile(getOutputPath(file), canvas.toBuffer(), (err) => {
            if (err) {
                log(chalk.red(err));
                log(chalk.red(`[fail]  file: [${file}] convert fail~~~`));
            } else {
                log(chalk.green(`[success]   file: [${file}] convert success~~~`));
            }
        });
    });
}


/**
 * 获取pdf文件保存路径
 *
 * @param {*} file 源文件路径
 * @returns pdf文件路径
 */
function getOutputPath(file) {
    let fileName = file.match(rFileName)[1] + '--' + (+new Date()) + '.pdf'
    return replace ? path.dirname(file) + '/' + fileName.replace(/--\d+/, '') : output + fileName;
}

// app start
fs.mkdir(output.replace(/\/$/, ''), (err) => {
    emptyDir(output);
    startConvert(source);
});