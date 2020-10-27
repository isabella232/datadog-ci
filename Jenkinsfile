pipeline {
    agent {
        docker { image 'node:12' }
    }
    environment {
        DD_TRACE_AGENT_HOSTNAME = 'host.docker.internal'
    }
    stages {
        stage('Test') {
            steps {
                sh 'yarn'
                sh 'yarn pack'
                sh 'node dist/index.js trace command yarn audit --level moderate'
                sh 'node dist/index.js trace command yarn test'
                sh 'node dist/index.js trace command yarn lint'
                sh 'node dist/index.js trace command yarn prettier-check'
            }
        }
    }
}