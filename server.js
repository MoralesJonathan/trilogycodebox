const express = require("express"),
    server = express(),
    axios = require('axios');
    bodyParser = require("body-parser"),
    rimraf = require("rimraf"),
    { spawn } = require('child_process'),
    fs = require('fs'),
    PORT = process.env.PORT || 8080;
    
server.use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use(express.static("public/"));

server.post('/login', (req, res) => {
    axios({
        method: 'post',
        url: 'https://www.bootcampspot.com/api/instructor/v1/login',
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            "email": req.body.email,
            "password": req.body.password
        }
    })
        .then(function (response) {
            if (response.data && response.data.success && response.data.authenticationInfo) {
                res.status(200).send(response.data.authenticationInfo.authToken)
            } else res.sendStatus(400);
        })
        .catch(function (error) {
            console.log(error);
            res.status(error.response.status).send(error.response.statusText);
        });
})
    .post('/cohorts', (req, res) => {
        if(req.body.auth){
            axios({
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    'authToken':req.body.auth
                },
                url: 'https://www.bootcampspot.com/api/instructor/v1/me'
            })
                .then(function (response) {
                    if (response.data && response.data.enrollments) {
                        const cohorts = response.data.enrollments.map(({id, active, course, ...rest}) => ({'enrollmentId':id, active, course}))
                        res.status(200).send(cohorts)
                    } else res.sendStatus(400);
                })
                .catch(function (error) {
                    console.log(error);
                    res.status(error.response.status).send(error.response.statusText);
                });
        } else res.sendStatus(400)
    })
    .post('/assignments', (req, res) => {
        if(req.body.enrollmentId){
        axios({
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'authToken':req.body.auth
            },
            url: 'https://www.bootcampspot.com/api/instructor/v1/assignments',
            data: {
                "enrollmentId": req.body.enrollmentId
            }
        })
            .then(function (response) {
                if (response.data && response.data.calendarAssignments) {
                    res.status(200).send(response.data.calendarAssignments)
                } else res.sendStatus(400);
            })
            .catch(function (error) {
                console.log(error);
                res.status(error.response.status).send(error.response.statusText);
            });
        } else res.sendStatus(400)
    })
    .post('/assignmentSubmissions', (req,res) => {
        if(req.body.assignmentId){
            axios({
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'authToken':req.body.auth
                },
                url: 'https://www.bootcampspot.com/api/instructor/v1/assignmentDetail',
                data: {
                    "assignmentId": req.body.assignmentId
                }
            })
                .then(function (response) {
                    if (response.data && response.data.students) {
                        res.status(200).send(response.data.students)
                    } else res.sendStatus(400);
                })
                .catch(function (error) {
                    console.log(error);
                    res.status(error.response.status).send(error.response.statusText);
                });
            } else res.sendStatus(400)
    })
    .post('/createCodebox', (req, res) => {
        const url = req.body.githubUrl;
        let gitHubFolderName;
        const gitClone = spawn('git', ['clone', url]);
        gitClone.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        gitClone.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
            const dataString = data.toString('utf8') //data is a buffer for whatever reason
            gitHubFolderName = (/Cloning into '(\w+)'.../g).exec(dataString);
            gitHubFolderName = gitHubFolderName[1]
        });
        gitClone.on('close', (code) => {
            console.log(`Git clone exited with code ${code}`);
            fs.writeFile(gitHubFolderName+'/codebox.config.json', '{ "template": "node" }', 'utf8', (error)=> { 
                if (error) throw err;
                let sandBoxUrl;
                const codeBoxCli = spawn('./codesandbox', [`../../${gitHubFolderName}`, '-y'], {cwd: "node_modules/.bin"});
                codeBoxCli.stdout.on('data', (data) => {
                        console.log(`stdout: ${data}`);
                        const dataString = data.toString('utf8')
                        sandBoxUrl = (/https:\/\/codesandbox.io\/s\/(\w+)/g).exec(dataString);
                        sandBoxUrl = sandBoxUrl != null? sandBoxUrl[1]: null;
                        if(dataString.includes("Are you sure you want to proceed with the deployment?")){
                            codeBoxCli.stdin.setEncoding('utf-8');
                            codeBoxCli.stdin.write("y\n");
                        }
                    });
                    codeBoxCli.stderr.on('data', (data) => {
                        console.log(`stderr: ${data}`);
                    });
                    codeBoxCli.on('close', (code) => {
                        console.log(`codesandbox exited with code ${code}`);
                        rimraf(g itHubFolderName, () =>  console.log("Github folder deleted"));
                        res.send(`<iframe src="https://codesandbox.io/embed/${sandBoxUrl}?autoresize=1&fontsize=14&hidenavigation=1" title="${'testing'}" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>`)
                    });
            });
        });
    })

    .post('/submitGrade', (req, res) => {
        //send grade with trilogy endpoint
        //delete codesandbox with nightmare?
    })

    .listen(PORT, function() {
        console.log(`Server running on port ${PORT}!`);
    });