import test from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
const old=fileURLToPath(new URL("../cloudflare/migrations/0001_core.sql",import.meta.url));
const current=fileURLToPath(new URL("../cloudflare/migrations/0002_work_management.sql",import.meta.url));

test("Projects/sections/tasks D1 migration enforces composite organization relationships",()=>{
 const py=[
  "import sqlite3,sys",
  "db=sqlite3.connect(':memory:')",
  "db.execute('PRAGMA foreign_keys=ON')",
  "db.executescript(open(sys.argv[1],encoding='utf8').read())",
  "db.executescript(open(sys.argv[2],encoding='utf8').read())",
  "db.execute(\"INSERT INTO organizations(id,name,slug) VALUES('o1','Org One','org-one'),('o2','Org Two','org-two')\")",
  "db.execute(\"INSERT INTO memberships(organization_id,user_id,role,status) VALUES ('o1','u1','owner','active'),('o2','u2','owner','active')\")",
  "db.execute(\"INSERT INTO wm_projects(organization_id,id,name,owner_user_id) VALUES('o1','p1','Project','u1')\")",
  "db.execute(\"INSERT INTO wm_sections(organization_id,project_id,id,name) VALUES('o1','p1','s1','Section')\")",
  "db.execute(\"INSERT INTO wm_section_collaborators(organization_id,project_id,section_id,user_id,permission) VALUES('o1','p1','s1','u1','edit')\")",
  "db.execute(\"INSERT INTO wm_tasks(organization_id,project_id,id,section_id,title,created_by_user_id) VALUES('o1','p1','t1','s1','Test task','u1')\")",
  "def blocked(sql):",
  " try:",
  "  db.execute(sql)",
  "  raise AssertionError('cross-company relationship was accepted: '+sql)",
  " except sqlite3.IntegrityError: pass",
  "blocked(\"INSERT INTO wm_projects(organization_id,id,name,owner_user_id) VALUES('o2','p2','X','u1')\")",
  "blocked(\"INSERT INTO wm_section_collaborators(organization_id,project_id,section_id,user_id,permission) VALUES('o1','p1','s1','u2','edit')\")",
  "blocked(\"INSERT INTO wm_tasks(organization_id,project_id,id,section_id,title,created_by_user_id) VALUES('o2','p1','t2','s1','X','u2')\")",
  "blocked(\"INSERT INTO wm_tasks(organization_id,project_id,id,section_id,title,created_by_user_id,assignee_user_id) VALUES('o1','p1','t3','s1','X','u1','u2')\")",
  "blocked(\"INSERT INTO wm_task_watchers(organization_id,project_id,task_id,user_id) VALUES('o1','p1','t1','u2')\")",
  "blocked(\"INSERT INTO wm_tasks(organization_id,project_id,id,section_id,title,created_by_user_id,priority) VALUES('o1','p1','t4','s1','X','u1','privileged')\")",
  "assert db.execute('SELECT COUNT(*) FROM wm_tasks').fetchone()[0]==1",
  "assert db.execute('PRAGMA foreign_key_check').fetchall()==[]",
  "print('OK')"
 ].join("\n");
 const p=spawnSync("python3",["-c",py,old,current],{encoding:"utf8"});
 assert.equal(p.status,0,p.stderr||p.stdout);
});
