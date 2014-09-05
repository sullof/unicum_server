/*!
 * Unicum version 0.0.4 - February 16th, 2014
 * (c) Francesco Sullo, francesco@hooq.co
 * Released under MIT Licence
 */

function Unicum(config) {


    // the redis db client:
    this.rc = config.rc;

    this._keystr = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    this._strlen = this._keystr.length;
    this._zeros = 2;
    this._maxKey = Math.pow(this._strlen, this._zeros),

        // linux timestamp at January 5th, 2014
        this._epoch = 1388904894;
    // you can change the _epoch in config. Be careful, when you have set this
    // you cannot change it anymore because if you change it all the previous
    // keys will be wrong

    this._keyTypeIndexes = {};

    this._zeroFill = function (n, z) {
        var l = z || this._zeros, r = n.toString(), d = l - r.length;
        for (var j = 0; j < d; j++)
            r = "0" + r;
        return r;
    };

    this._nullfunc = function () {
    };

    this._arrange = function (k) {
        var key = (k || '').toString().split("-")[0], l = key.length, ktype = this
            .fromInt62(key.substring(l - 2, l));
        if (this._keyTypeIndexes[ktype]) {
            var sec32 = key.substring(0, l - 7), microsec32 = key.substring(
                    l - 7, l - 3), variant62 = key.substring(l - 3, l - 2);
            return {
                sec: sec32 ? this.fromInt62(sec32) : 0,
                microsec: microsec32 ? this.fromInt62(microsec32) : 0,
                variant: this.fromInt62(variant62),
                ktype: ktype,
                suffix: key[1] || ''
            };
        } else
            return null;
    };

    // public properties and methods

    this.keyTypes = {};

    this.addKeyType = function (key, val) {
        /*
         * return: 1 ok -1 already exists 0 error
         */
        for (var j in this.keyTypes)
            if (j == key)
                return -1;
            else if (this.keyTypes[j] == val)
                return 0;
        this.keyTypes[key] = val;
        this._keyTypeIndexes[val.toString()] = key;
        return 1;
    };

    this.toHash = function (arr) {
        if (Array.isArray(arr)) {
            var ret = {};
            for (var i = 0; i < arr.length; i++)
                ret[arr[i]] = true;
            return ret;
        }
        else return arr;
    };

    this._isObject = function (o) {
        return o && toString.call(o) === "[object Object]";
    };

//    this._convert = function (hash, minify, filter) {
//        if (filter)
//            filter = this.toHash(filter);
//        var ret = {};
//        for (var i in hash) {
//            var key = this[minify ? "subKeyInverse" : "subKey"](i, true);
//            if (key && (!filter || filter[minify ? i : key])) {
//                var nextFilter =
//                        filter && filter[minify ? i : key] && this._isObject(filter[minify ? i : key])
//                    ? filter[minify ? i : key]
//                    : null;
//                if (this._isObject(hash[i]))
//                    ret[key] = this._convert(hash[i], minify, nextFilter);
//                else if (Array.isArray(hash[i])) {
//                    ret[key] = [];
//                    for (var k = 0; k < hash[i].length; k++)
//                        if (this._isObject(hash[i][k]))
//                            ret[key][k] = this._convert(hash[i][k], minify, nextFilter);
//                        else
//                            ret[key][k] = hash[i][k];
//                }
//                else
//                    ret[key] = hash[i];
//            }
//        }
//        return ret;
//    };
//
//    this.minify = function (hash, filter) {
//        /*
//         * Calling .translate({name:"John",city:"London"}) return something like
//         *
//         * {n:"John",c:"London"}
//         *
//         * using the subKeys set in the config file.
//         *
//         */
//        return this._convert(hash, true, filter);
//    }
//
//    this.maxify = function (hash, filter) {
//        /*
//         * Does the opposite of .minify Good to understand what a minified hash
//         * means
//         */
//        return this._convert(hash, false, filter);
//    }

//    this.addSpecialKey = function (key, val) {
//        /*
//         * return: 1 ok -1 already exists 0 error
//         */
//        for (var j in this.specialKeys)
//            if (j == key)
//                return -1;
//        var kt = this.keyTypes[val];
//        if (typeof kt !== 'number')
//            return 0;
//        this.specialKeys[key] = this.customKey(0, 0, kt, key);
//        return 1;
//    };

    this.isInt62 = function (s) {
        var re = new RegExp("[^" + this._keystr + "]");
        if (!s || re.test(s))
            return false;
        return true;
    };

    this.fixInt62 = function (s) {
        var re = new RegExp("[^" + this._keystr + "]*", 'g');
        return (s || '').toString().replace(re, '');
    };

    this.toInt62 = function (x, z) {
        if (!x)
            return (z ? this._zeroFill(0, z) : "0");
        var ret = "";
        while (x > 0) {
            var p = x % this._strlen;
            ret = this._keystr.substring(p, p + 1) + ret;
            x = Math.floor(x / this._strlen);
        }
        if (z)
            ret = this._zeroFill(ret, z);
        return ret;
    };

    this.fromInt62 = function (x) {
        if (!x)
            return 0;
        var ret = 0;
        for (var j = x.length; j; j--) {
            var p = -1 * (j - x.length);
            ret += this._keystr.indexOf(x.substring(p, p + 1))
                * Math.pow(this._strlen, j - 1);
        }
        return ret;
    };

    this.ts = function (d, noInt62) {
        // timestamp in seconds starting since our epoch.
        // Consider that this value is not based on the Redis time
        // but on the OS time. If Redis is on a different server they
        // could be different.
        if (d && typeof d != 'number')
            d = d.getTime();
        var ret = Math.floor((d ? d : Date.now()) / 1000) - this._epoch;
        return noInt62 ? ret : this.toInt62(ret);
    };

    this.linuxTs = function (d, noInt62) {
        // from a relative timestamp to a Unix timestamp
        return d ? (noInt62 ? d : this.fromInt62(d)) + this._epoch : -1;
    };

    this.generate = function (ktype, quantity, cb) {
        var thiz = this,
            rc = thiz.rc;
        ktype = typeof ktype == 'number' && ktype > -1
            && ktype < thiz._maxKey - 1 ? ktype : thiz._maxKey - 1;
        if (!cb) {
            cb = quantity;
            quantity = 1;
        }
        callback = cb || thiz._nullfunc;

        rc.time(function (err, time) {

            console.log("time", time);

            if (err != null)
                callback(null);
            else
                rc.incr("sequence:" + ktype, function (err2, variant) {
                    if (err2 != null)
                        callback(null);
                    else {
                        var sec = time[0] - thiz._epoch
                            , microsec = parseInt(time[1])
                            , variant62 = thiz.toInt62(variant % this._strlen);

                        var sec62 = thiz.toInt62(sec)
                            , microsec62 = thiz.toInt62(microsec, 4)
                            , ktype62 = thiz.toInt62(ktype, 2);

                        console.log(sec, microsec, ktype);
                        console.log(sec62, microsec62, ktype62);
                        console.log(variant, variant62);

                        if (quantity == 1) {
                            var key = sec62
                                + microsec62
                                + variant62
                                + ktype62;
                            callback(key);
                        } else {
                            var keys = [], ms = time[1];
                            for (var j = 0; j < quantity; j++) {
                                keys[j] = sec62
                                    + thiz.toInt62(
                                        ms, 4)
                                    + variant62
                                    + ktype62;
                                ms++;
                                if (ms == 1000000) {
                                    ms = 0;
                                    sec62 = thiz
                                        .toInt62(++sec);
                                }
                            }
                            callback(keys);
                        }
                    }
                });
        });
    };

//    this.customKey = function (sec, microsec, ktype, suffix) {
//        var key = (sec ? this.toInt62(sec) : "")
//            + (sec || microsec ? this.toInt62(microsec, 4) + "0" : "")
//            + this.toInt62(ktype, 2)
//            + (suffix ? '-' + this.fixInt62(suffix) : '');
//        return key;
//    };
//
    this.changeKeyType = function (key, newtype) {
        if (!key)
            return null;
        if (typeof newtype != 'number')
            newtype = this.keyTypes[newtype]
                // Maybe if the keyType doesn't exist it should return an error.
                // Any suggestions?
                || this._maxKey - 1;
        return key.substring(0, key.length - 2) + this.toInt62(newtype, 2);
    };

    this.getType = function (key) {
        var k = this._arrange(key);

        if (k)
            return this._keyTypeIndexes[k.ktype];
        return null;
    };

    this.getInfo = function (key, verify) {
        var type = this.getType(key);
        var date = this.getTime(key, true);
        if (type && date)
            return {
                key: key,
                type: type,
                date: date
            };
        else return null;
    };

    this.toISODate = function (d0) {
        var d = typeof d0 == 'number' ? new Date(d0) : d0;

        function f(n) {    // Format integers to have at least two digits.
            return n < 10 ? '0' + n : n;
        }

        var date = d.getFullYear() + '-' +
            f(d.getMonth() + 1) + '-' +
            f(d.getDate()) + 'T' +
            f(d.getHours()) + ':' +
            f(d.getMinutes()) + ':' +
            f(d.getSeconds()) + ':' +
            f(d.getMilliseconds()) + 'Z';

        return date;
    };

    this.getTime = function (key, isoFormat) {
        var k = this._arrange(key);
        if (k.sec) {
            var sec = (k.sec + this._epoch) * 1000;
            var millis = sec + parseInt(this._zeroFill(""+Math.floor(k.microsec / 1000),3), 10);
            if (isoFormat)
                return this.toISODate(millis);
            else
                return millis;
        }
        return null;
    };

    this.getEpoch = function () {
        return this._epoch;
    };

    // set special keys (indexes, etc.)
    var keyTypes = config.types || {}
        , max = this._maxKey;

    // default key
    keyTypes['undefined'] = max - 1;
    this._keyTypeIndexes[(max - 1).toString()] = 'undefined';

    for (var j in keyTypes)
        if (!this.addKeyType(j, keyTypes[j]))
            console.log("Error creating keytype " + j);

//    for (j in specialKeys) {
//        var specialKeys = config.specialKeys || {};
//        if (!this.addSpecialKey(j, specialKeys[j]))
//            console.log("Error creating special key " + j);
//    }

//    if (config.subKeys)
//        for (var j in config.subKeys) {
//            this._subKeys[j] = config.subKeys[j];
//            this._subKeysInverse[config.subKeys[j]] = j;
//        }
    var thiz = this;
    this.rc.get('epoch', function (err, epoch) {
//        if (!epoch) {
        var now = Date.now();
            epoch = Math.floor(now / 1000) - 10;
            thiz.rc.set('epoch', epoch);
//        }
        thiz._epoch = epoch;

        console.log("epoch", epoch);
    });

    this.generate(0, function (key) {
       console.log("key", key);
        console.log(thiz.getInfo(key));


    });


//    console.log(JSON.stringify(this.keyTypes));
//    console.log(JSON.stringify(this._keyTypeIndexes));
};

module.exports = {

    init: function (config) {
        return new Unicum(config);
    }
};