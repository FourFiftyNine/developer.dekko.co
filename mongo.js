var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;

MongoDB = function(host, port) {
  this.db= new Db('dekko', new Server(host, port, {auto_reconnect: true}, {}));
  this.db.open(function(){});
};

MongoDB.prototype.getCollection= function(callback) {
  this.db.collection('everything', function(error, mycollection) {
    if( error ) callback(error);
    else callback(null, mycollection);
  });
};

MongoDB.prototype.find_all = function(callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error)
    else {
      mycollection.find().toArray(function(error, results) {
        if( error ) callback(error)
        else callback(null, results)
      });
    }
  });
};

MongoDB.prototype.find_all_by = function(hash,callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error)
    else {
      mycollection.find(hash).toArray(function(error, results) {
        if( error ) callback(error)
        else callback(null, results)
      });
    }
  });
};

MongoDB.prototype.count_all_by = function(hash,callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error,0)
    else {
      mycollection.find(hash).count(callback);
    }
  });
};

MongoDB.prototype.find_one_by_id = function(id, callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error)
    else {
      mycollection.findOne({_id: mycollection.db.bson_serializer.ObjectID.createFromHexString(id)}, function(error, result) {
        if( error ) callback(error)
        else callback(null, result);
      });
    }
  });
};

MongoDB.prototype.find_one_by = function(hash,callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error)
    else {
      mycollection.findOne(hash, function(error, results) {
        if( error ) callback(error)
        else callback(null, results);
      });
    }
  });
};

MongoDB.prototype.save = function(blobs, callback) {
  if( typeof(blobs.length)=="undefined") blobs = [blobs];
  this.getCollection(function(error, mycollection) {
    if( error ) { if(callback) callback(error,null); }
    else {
      mycollection.insert(blobs, function() { if(callback) callback(null, blobs); });
    }
  });
};

MongoDB.prototype.update = function(blob, callback) {
  this.getCollection(function(error, mycollection) {
    if( error ) callback(error)
    else {
      mycollection.save(blob, function() { callback(null,blob); }); 
      // mycollection.update(blob, function() { callback(null, blob); });
    }
  });
};

exports.MongoDB = MongoDB;

