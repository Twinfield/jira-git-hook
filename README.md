# Why?

Local hooks are used for self-controlling of local commits. In general as git in distributed system, local repositories are not connected to any server and activities on them couldn't be controlled from main repository. But currently, on our main repository there is a global hook, that does not accept commits, that has comments without mentioning some Jira issue. 

So though you can commit locally without mentioning Jira issues, you will not be allowed to push them into main repository.

As every developer can sometimes forget to add comment or mention Jira issue, we decided to add possibility to install local hook, that will check local commits for comments.

Issues should be mentioned in any place of comment in the square braces. For example: "```I've fixed [DEV-12312] and it should work now```"

# How?

## Pre-requisites 

### Node.JS
As hook is written in Node.JS, you need to install it. You can get installation package from [[http://nodejs.org/dist/]]
(it should work on any version, but in case of errors you can try any from this range 0.5.1 - 0.5.7)

### Clone repository

You should already have cloned repository on your computer. Follow Git/GitHub instructions how to do that

### JiraGitHook script

Fetch lastest version if hook script from [[http://github.com/olostan/jira-git-hook/raw/master/gitjira.js]]

## Installing

### Hook

Rename gitjira.js into commit-msg and put it into .git/hooks folder inside of your repository

### Configuration

From the root of your repository, run this commands:
    
    git config jira.url <your Jira URL>

You need to put your JIRA login/password into URL. Example: `https://mylogin:mypassword@mycompany.atlassian.net/`

## Test

try to make any commit without mentioning any Jira issue. For successful commit, issue should be 'In Progress' status.

## What?

Interesting question. I do not know.
