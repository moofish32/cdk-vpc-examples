import ec2 = require('@aws-cdk/aws-ec2')
import asg = require('@aws-cdk/aws-autoscaling')
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

// in this example we override the ASG to access the associatePublicIpAddress value
class ExampleASGOverride extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props: MyVpcProps = {}) {
    super(parent, id, props);
    const vpc = new ec2.VpcNetwork(this, 'Vpc', {
      subnetConfiguration: [{
        cidrMask: 24,
        name: 'public',
        subnetType: ec2.SubnetType.Public,
      }]
    });

    const instanceType = new ec2.InstanceTypePair(ec2.InstanceClass.Burstable3,
      ec2.InstanceSize.Micro);
    const machineImage = new ec2.AmazonLinuxImage();
    const myAsg = new asg.AutoScalingGroup(this, 'MyASG', {
      instanceType,
      machineImage,
      vpc,
    });

    // ok now let's pretend we want to map a public IP.
    // A use case for this might be importing an exiting vpc where
    // mapPublicIpOnLaunch is not set in your public subnets
    const lcType = 'AWS::AutoScaling::LaunchConfiguration';
    const resource = myAsg.children.
      find (c => (c as cdk.Resource).resourceType === lcType);
    const lcResource = resource as asg.cloudformation.LaunchConfigurationResource;
    lcResource.propertyOverrides.associatePublicIpAddress = true;
  }
}

class MyApp extends cdk.App {

  public readonly tags: cdk.TagManager;

  constructor() {
    super();

    new ExampleASGOverride(this, 'Overrides');
    new VpcStack(this, 'CdkDefaultVpcStack')

    new VpcStack(this, 'EksVpcPublic', {
      eksClusterName: 'PublicEks',
      vpcProps: {
        subnetConfiguration: [ {
          subnetType: ec2.SubnetType.Public,
          name: 'EksPublic'
        } ]
      }
    });

    new VpcStack(this, 'EksVpcPrivate', {
      eksClusterName: 'PrivateEks',
      vpcProps: {
        subnetConfiguration: [ {
          subnetType: ec2.SubnetType.Private,
          name: 'EksPrivate'
        } ]
      }
    });

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
    });
  }
}

new MyApp().run();

