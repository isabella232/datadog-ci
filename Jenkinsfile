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
                sh 'datadog-ci trace command yarn test'
                sh 'datadog-ci trace command yarn lint'
                sh 'datadog-ci trace command yarn prettier-check'
            }
        }
    }
}