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
                sh 'node dist/index.js trace command sleep 1'
                sh 'node dist/index.js trace command ls -r'
                sh 'node dist/index.js trace command ls -ee'
            }
        }
    }
}