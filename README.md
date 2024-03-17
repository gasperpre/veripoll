[Go to MACI repo](https://github.com/gasperpre/maci)

# AnonVote

AnonVote employs a quadratic and collusion-resistant voting mechanism on Ethereum called Minimal Anti-Collusion
Infrastructure (MACI) to prevent bribery and scale images quadratically. Additionally, it uses World ID to ensure sybil resistance.

## How to run AnonVote locally

Clone this repo. Install dependencies by running `yarn` or `npm install`:

```bash
yarn  # or `npm install`
```

Copy `.env.sample` and name it `.env`.

In `.env` set values for all the missing variables, such as `MONGO_URL`, `AZURE_STORAGE_ACCOUNT_NAME`,
`AZURE_CONTAINER_NAME`, `AZURE_KEY`, `AZURE_CONNECTION_STRING`. You can find detailed guides on setting up [MongoDB](#setting-up-mongodb) and [Azure Storage](#setting-up-azure-storage) towards the end of this doc.

```bash
cp .env.sample .env
vim .env  # set `MONGO_URL, AZURE_STORAGE_ACCOUNT_NAME, etc...`
```

Your `.env` file should looks something like this:
```bash
NEXT_PUBLIC_MACI_ADDRESS=0x0eBD0f5C0F0131418ab6e49De1a40c3a86722b4f

NEXT_PUBLIC_STRAPI_URL=https://strapi-admin.quadratic.page

MONGO_URL=mongodb+srv://user:password@mongodb-ip-or-dns.com/database...

AZURE_STORAGE_ACCOUNT_NAME=qdh
AZURE_CONTAINER_NAME=qdh-user-images
AZURE_KEY=24f234f234f+24f243f+24f243f/24f234f234f2f24f==...
AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https...
```

Now run `yarn dev` (or `npm run dev`)

Frontend is now accessible on http://localhost:3000

Now let's set up and deploy MACI on a local testnet.

## Setting up MACI

In a separate terminal, clone MACI: https://github.com/appliedzkp/maci

Carefully follow the steps in ["Local development and testing"](https://github.com/appliedzkp/maci#local-development-and-testing): bootstrap MACI repo, install Rust, build zk-SNARKs, compile contracts, deploy them and deploy a poll.

Once you've deployed MACI and created a poll, add your MACI contract address to `.env`.


## Setting up Azure Storage
1. Create a Storage account. Give it a name. For example `qdh`
2. Go to Storage account > Overview
3. Click on Containers. Create a new storage container. Let's name it `qdh-user-images`. Make sure that the "Public access level" is set to **Blob (anonymous access for blobs only)**
4. Click on Settings > Access keys. Copy paste Account Name, Key and Connection String from there.
5. Tada! You now have `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_CONTAINER_NAME`, `AZURE_KEY`, `AZURE_CONNECTION_STRING`:

```bash
AZURE_STORAGE_ACCOUNT_NAME='qdh'
AZURE_CONTAINER_NAME='qdh-user-images'
AZURE_KEY='24f234f234f+24f243f+24f243f/24f234f234f2f24f==...'
AZURE_CONNECTION_STRING='DefaultEndpointsProtocol=https...'
```
![Screenshot 2021-02-03 at 3 21 41 PM](https://user-images.githubusercontent.com/936436/106730581-82522780-6649-11eb-88a7-a928e6bbe5bd.png)

p.s. We'll eventually try to make this project cloud agnostic. Feel free to contribute!

## Setting up MongoDB

- If you are are looking for a free & easy MongoDB hosting, try [Mongo Atlas](https://www.mongodb.com/cloud/atlas)
- If you've used [Dokku](https://github.com/dokku/dokku) before, you can deploy mongo instance on it using [dokku-mongo](https://github.com/dokku/dokku-mongo) plugin.
- You can also deploy MongoDB on your IaaS or PaaS of choice.
