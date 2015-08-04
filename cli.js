/* LottoBotVerify / cli.js
 * command line interface for LottoBotVerify
 * (c) 2015 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var LottoBotVerify = require('./lotto-bot-verify.min.js'),
    yargs = require('yargs'),
    argv = 
        yargs
        .usage('Usage: lotto-bot-verify -h [JD secret hash] -u [mongodb url]')
        
        .alias('h', 'hash')
        .describe('h', 'Just-Dice secret hash (for login).')
        .demand('h')
        .nargs('h', 1)
        
        .alias('u', 'url')
        .describe('u', 'The mongodb url to connect to.')
        .demand('u')
        .nargs('u', 1)
        
        .help('help')
        .argv;

new LottoBotVerify(
    argv.hash,
    argv.url,
    function(err) {
        if(err) {
            console.error(err);
        }
    });