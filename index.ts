import ec2 = require('@aws-cdk/aws-ec2')
import cdk = require('@aws-cdk/cdk')

interface MyVpcProps extends cdk.StackProps {
    vpcProps?: ec2.VpcNetworkProps;
    eksClusterName?: string;
}

class VpcStack extends cdk.Stack {

    public readonly vpc: ec2.VpcNetwork;

    constructor(parent: cdk.App, id: string, props: MyVpcProps = {}) {
        super(parent, id, props);
        this.vpc = new ec2.VpcNetwork(this, 'VpcStack', props.vpcProps);
        if (props.eksClusterName != undefined) {
            this.vpc.tags.setTag(`kubernetes.io/cluster/${props.eksClusterName}`, 'shared')
        }

    }
}

class MyApp extends cdk.App {
    constructor(argv: string[]) {
        super(argv);

        new VpcStack(this, 'CdkDefaultVpcStack')

        new VpcStack(this, 'EksVpcPublic', {
            eksClusterName: 'PublicEks',
            vpcProps: {
                subnetConfiguration: [ {
                    subnetType: ec2.SubnetType.Public,
                    name: 'EksPublic'
                } ]
            }
        })

        new VpcStack(this, 'EksVpcPrivate', {
            eksClusterName: 'PublicEks',
            vpcProps: {
                subnetConfiguration: [ {
                    subnetType: ec2.SubnetType.Private,
                    name: 'EksPrivate'
                } ]
            }
        })

        new VpcStack(this, 'WebApp', {
            vpcProps: {
                cidr: '192.168.0.0/16',
                subnetConfiguration: [
                    {
                        subnetType: ec2.SubnetType.Private,
                        name: 'App',
                        cidrMask: 21,
                    },
                    {
                        subnetType: ec2.SubnetType.Public,
                        name: 'PublicLoadBalancers',
                        cidrMask: 24,
                    },
                    {
                        subnetType: ec2.SubnetType.Isolated,
                        name: 'RdsDatabases',
                        cidrMask: 27,
                    }
                ]
            }
        })
    }
}

process.stdout.write(new MyApp(process.argv).run());

