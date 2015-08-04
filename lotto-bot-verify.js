/* LottoBotVerify
 * proof of solvency for LottoBot
 * (c) 2015 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* UMD LOADER: https://github.com/umdjs/umd/blob/master/returnExports.js */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals (root is window)
        root.LottoBotVerify = factory();
  }
}(this, function() {
    var JustBot = require('just-bot'),
        S = require('string'),
        Hash = require('bitcore').crypto.Hash,
        MongoClient = require('mongodb').MongoClient,
        EventEmitter = require('events').EventEmitter,
        LottoBotVerify;
    
    LottoBotVerify = function(hash, url, eh) {
        var that = this,
            bot;
        
        this.version = '0.0.1';
        this.lotto = '1188682';
        this.owner = '1105420';
        this.last = [];
        
        this.eh = eh;
        this.bot = bot = new JustBot(hash);
        this.prompt = new EventEmitter();
        
        bot.on('ready', function() {
            that.cmd('ping');
            
            MongoClient.connect(url, function(err, db) {
                if(!err) {
                    that.tickets = db.collection('tickets');
                } else {
                    that.eh(err);
                }
            });
        });
        
        bot.on('msg', function(msg) {
            if(msg.user === that.lotto) {
                //console.log(msg.txt);
                
                try {
                    var obj = JSON.parse(msg.txt);
                    
                    that.prompt.emit(obj.command, obj.data);
                } catch(e) {
                    that.eh(e);
                }
            }
        });
        
        bot.on('result', function(res) {
            that.cmd('draw', {
                res: res,
                last: that.last.shift()
            });
        });
        
        this.prompt.on('pong', function() {
            bot.msg(that.owner, 'LottoBotVerify v' + that.version + ' started');
        });
        
        this.prompt.on('jackpot', function(user) {
            that.cmd('jackpot', {
                user: user,
                balance: that.bot.balance
            });
        });
        
        this.prompt.on('nowin', function() {
            that.cmd('nowin', that.bot.balance);
        });
        
        this.prompt.on('roll', function(betid) {
            that.last.push(betid);
            bot.roll(that.chance, 0);
        });
        
        this.prompt.on('set', function(data) {
            var UID = data.uid,
                TICKETID, lucky, one, two, three, magic;
            
            TICKETID = data.betid;
            lucky = Hash.sha256(new Buffer([UID.toString(10), TICKETID.toString(10)].join(':'), 'utf8'));
            one = S(lucky.readUInt8(0).toString(10)).right(2);
            two = S(lucky.readUInt8(1).toString(10)).right(2);
            three = S(lucky.readUInt8(2).toString(10)).right(2);
            
            magic = parseInt([one, two, three].map(function(v) {
                if(v.length === 1) {
                    return '0' + v;
                } else {
                    return v;
                }
            }).join(''), 10);
            
            if(data.magic === magic) {
                that.tickets.insert({
                    ts: +new Date(),
                    magic: magic,
                    uid: data.uid
                }, function(err) {
                    if(!err) {
                        that.cmd('ticket', {
                            magic: magic,
                            uid: data.uid,
                            betid: data.betid
                        });
                    } else {
                        that.eh(err);
                    }
                });
            } else {
                that.bot.msg(that.owner, 'provavbly failed: ' + JSON.stringify(data));
            }
        });
        
        this.prompt.on('verify', function(data) {
            that.tickets.find({
                magic: data.res.lucky,
                '$sort': {
                    ts: -1
                },
                '$limit': 1
            }, function(err, docs) {
                if(!err) {
                    if(docs.length === 1) {
                        var doc = docs[0];
                        
                        if(doc.uid === data.winner) {
                            that.cmd('winner', {
                                winner: doc.uid,
                                balance: that.bot.balance,
                                betid: data.res.betid
                            });
                            
                            that.bot.tip(doc.uid, that.bot.balance);
                            that.tickets.drop(that.eh);
                        } else {
                            that.bot.msg(that.owner, 'provavbly failed: ' + JSON.stringify(data) + ' ' + JSON.stringify(doc));
                        }
                    } else {
                        that.bot.msg(that.owner, 'provavbly failed: ' + JSON.stringify(data));
                    }
                } else {
                    that.eh(err);
                }
            });
        });
    };
    
    LottoBotVerify.prototype.cmd = function(command, data) {
        this.bot.msg(this.lotto, JSON.stringify({
            command: command,
            data: data
        }));
    };
    
    return LottoBotVerify;
}));
