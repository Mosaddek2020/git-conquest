## story | "Git is just a content-addressable filesystem"

Halima kept memorising commands without feeling she understood git. A colleague said: "Spend one hour inside `.git` and everything will click." They hashed a tiny piece of text:

```term
$ echo "hello" | git hash-object --stdin
ce013625030ba8dba906f756967f9e9ca394464a
```

Every git installation in the world produces that same id for the content "hello" plus a newline, because the id **is** a hash of the content. Commits, folders and files are all stored that way. Branches are just files holding ids. After that hour, merge, rebase and reset stopped being magic.

## model | Four kinds of objects

```diagram
object-model
```

| Object | Stores | Points to |
|---|---|---|
| **blob** | the content of one file (no name!) | nothing |
| **tree** | one directory: names, modes and ids of blobs and subtrees | blobs, trees |
| **commit** | author, committer, message, one tree, zero or more parents | a tree, parent commits |
| **tag** (annotated) | tagger, message, and an object id | usually a commit |

Every object's id is the **SHA-1 of its type, size and content**. So:

- identical content is stored **once**, however many commits contain it;
- changing anything (even one byte of a message) changes the id, and every id that depends on it;
- history is **tamper-evident**: you cannot change an old commit without changing every later id.

Branches and tags are **refs**: small files mapping names to ids. HEAD is a ref to a ref.

## commands | Exploring the object database

```term
$ git cat-file -t HEAD              # type: commit
$ git cat-file -p HEAD              # the commit: tree, parent, author, message
$ git cat-file -p HEAD^{tree}       # the root tree: one line per file or folder
$ git cat-file -p <blob-id>         # a file's content
$ git cat-file -s <id>              # size in bytes
$ git hash-object file.txt          # the id this content would have
$ git rev-parse HEAD                # resolve any name to a full id
$ git ls-files --stage              # the index: mode, blob id, stage, path
$ ls .git/objects                   # loose objects, in folders named by the first 2 hex digits
$ cat .git/refs/heads/main          # a branch is just an id
```

## analogy | A library that files pages by fingerprint

Imagine a library where every page is filed under a fingerprint computed from its exact text. Two identical pages share one slot. A chapter (tree) is a card listing page fingerprints in order. A book edition (commit) is a card pointing at its chapter list and at the previous edition. Change one comma and you get a new fingerprint, a new chapter card and a new edition card. Nothing old is ever overwritten.

## inside | How familiar commands map to objects

- `git add` writes **blobs** for the staged content and records them in the index.
- `git commit` writes **trees** from the index and a **commit** pointing at the root tree and the parent, then moves the branch ref.
- `git branch x` writes one ref file.
- `git merge` (non-fast-forward) writes a commit with **two parents**.
- `git rebase` writes new commits with new parents (hence new ids); trees for unchanged files are reused.
- `git gc` packs loose objects into compressed pack files and removes unreachable ones after their grace period.

## traps | Internals traps

**Editing files in `.git` by hand.** Use commands; you can corrupt the repository.

**"SHA-1 is broken, so git is insecure."** Git uses hardened SHA-1 with collision detection and supports SHA-256 repositories. For everyday integrity, ids remain reliable.

**Expecting blobs to know their filename.** Names live in trees, which is why renaming a file creates a new tree but reuses the same blob.

## lab | Open the hood

Explore a small repository at the object level: hash content, read a commit, walk its tree down to a blob, and prove that identical content is stored only once.
