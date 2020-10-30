pipeline {
    agent {
        none
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