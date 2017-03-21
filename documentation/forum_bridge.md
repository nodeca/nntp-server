Forum NNTP bridge design
========================

Here are some notes how to create NNTP gate to read forum
via newsreaders.


General
-------

NNTP messages have autoincremental enumeration inside each group.
With high probability you will need to create separate message index,
and keep it in sync with source (forum) data.

Additional edges you should know:

- If you use authentication, it can be requested by client very often
  (on every new connection). Caching is a good idea.
- It's a good idea to cache access check to forum sections.
- Try to acheive minimal latency for article fetch. NNTP clients
  fetch headers with blocks, but articles only one-by-one. Though
  pipelining should compensate this if supported by client.
- No need to implement LAST and NEXT commands. Those are not
  used by clients.
- All clients still use XOVER/XHDR instead of OVER/HDR.
- None of known clients support STARTTLS (rfc4642). If you need
  authentication, you should use SSL at 563 port for security.
- None of known clients support compression (rfc8054).

Other things to know:

- Usually, your NNTP index can have only minimal mapping info, and
  you may merge the rest of data from source.
- It's a good idea to restrict index depth by time.
- Messages are threaded. You can simplify things and make all messages
  refer to first one in thread.


Data & DB
---------

First, read
[source comments](https://github.com/nodeca/nntp-server/blob/master/index.js).
Each method to override has decription of data format.

Examples below are from Nodeca. Note:

- We store only minimal possible set of data, and read the rest from
  original source.
- We do NOT support full index consistency. Only add/delete, no restore. That's
  enougth for real world and simplifies permissions check significantly.

You may have another approach. For example - no permissions, full consistency
via SQL triggers et al.


### Groups collection

```js
const Schema = require('mongoose').Schema;

const Group = new Schema({
  name:       String,
  source:     Schema.ObjectId,
  // content type (usually, 'forum')
  type:       String,
  // min visible post index (default max_index+1 means that group is empty)
  min_index:  { type: Number, 'default': 1 },
  // max visible post index
  max_index:  { type: Number, 'default': 0 },
  // Message counter. We can't use min/max directly,
  // because last message can be deleted.
  last_index: { type: Number, 'default': 0 }
}, {
  versionKey: false
});

// to find a group by name (GROUP command)
Group.index({ name: 1 });

// to find a group for a forum section
Group.index({ source: 1 });
```


### Articles collection

Source postings <=> NNTP messages mapping.

```js
const Schema = require('mongoose').Schema;

const Article = new Schema({
  source:  Schema.ObjectId,
  group:   Schema.ObjectId,
  index:   Number
}, {
  versionKey: false
});

// to find an article by message_id (ARTICLE command)
Article.index({ source: 1 });

// to get range of articles inside a group
Article.index({ group: 1, index: 1 });
```
