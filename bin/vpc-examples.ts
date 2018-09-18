#!/usr/bin/env node
import sns = require('@aws-cdk/aws-sns');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');

class VpcExamplesStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);

        const queue = new sqs.Queue(this, 'VpcExamplesQueue', {
            visibilityTimeoutSec: 300
        });

        const topic = new sns.Topic(this, 'VpcExamplesTopic');

        topic.subscribeQueue(queue);
    }
}

const app = new cdk.App(process.argv);

new VpcExamplesStack(app, 'VpcExamplesStack');

process.stdout.write(app.run());
