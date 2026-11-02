import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
const root=path.dirname(fileURLToPath(import.meta.url));
const schema=path.join(root,"../migrations/0001_core.sql");
test("D1 schema migrates in SQLite and enforces tenant composite foreign keys / active ad cap",()=>{
 const code = [
  "import sqlite3,sys",
  "db=sqlite3.connect(':memory:')",
  "db.execute('pragma foreign_keys=on')",
  "db.executescript(open(sys.argv[1],encoding='utf8').read())",
  "db.execute(\"INSERT INTO organizations(id,name,slug) VALUES('a','A','a'),('b','B','b')\")",
  "db.execute(\"INSERT INTO crm_accounts(id,organization_id,name) VALUES('x','a','Client A')\")",
  "try:",
  " db.execute(\"INSERT INTO crm_contacts(id,organization_id,account_id,full_name) VALUES('c','b','x','blocked')\")",
  " raise AssertionError('cross-tenant foreign key bypass')",
  "except sqlite3.IntegrityError: pass",
  "for n in range(5):",
  " db.execute(\"INSERT INTO ad_campaigns(id,advertiser_name,headline,format,starts_at,ends_at,status) VALUES(?,?,?,?,?,?,?)\", (str(n),'Advertiser','Ad','motion','2026-11-01T00:00:00Z','2026-12-01T00:00:00Z','active'))",
  "try:",
  " db.execute(\"INSERT INTO ad_campaigns(id,advertiser_name,headline,format,starts_at,ends_at,status) VALUES('six','Ad','Ad','motion','2026-11-01T00:00:00Z','2026-12-01T00:00:00Z','active')\")",
  " raise AssertionError('sixth active ad allowed')",
  "except sqlite3.IntegrityError: pass",
  "print('ok')"
 ].join("\n");
 const python=spawnSync("python3",["-c",code,schema],{encoding:"utf8"});
 assert.equal(python.status,0,python.stderr||python.stdout);
});
