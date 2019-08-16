resource "aws_vpc" "theVpc" {
  cidr_block = "${var.cidrBlock}"
  enable_dns_support = true
  enable_dns_hostnames = true
  tags = "${merge(var.globalTags, map("Name", "${var.project}-vpc"))}"
}

resource "aws_subnet" "subnetPublic1" {
  availability_zone = "${var.az1}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 1)}"  // CIDR.CIDR.1.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPublic1"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_subnet" "subnetPublic2" {
  availability_zone = "${var.az2}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 2)}"  // CIDR.CIDR.2.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPublic2"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_subnet" "subnetPublic3" {
  availability_zone = "${var.az3}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 3)}"  // CIDR.CIDR.3.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPublic3"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_subnet" "subnetPrivate1" {
  availability_zone = "${var.az1}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 4)}"  // CIDR.CIDR.4.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPrivate1"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_subnet" "subnetPrivate2" {
  availability_zone = "${var.az2}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 5)}"  // CIDR.CIDR.5.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPrivate2"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_subnet" "subnetPrivate3" {
  availability_zone = "${var.az3}"
  cidr_block = "${cidrsubnet(aws_vpc.theVpc.cidr_block, 8, 6)}"  // CIDR.CIDR.6.0/24
  tags = "${merge(var.globalTags, map("Name", "${var.project}-subnetPrivate3"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_route_table" "rtbPublic" {
  tags = "${merge(var.globalTags, map("Name", "${var.project}-rtbPublic"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_route_table_association" "rtbaPublic1" {
  route_table_id = "${aws_route_table.rtbPublic.id}"
  subnet_id = "${aws_subnet.subnetPublic1.id}"
}

resource "aws_route_table_association" "rtbaPublic2" {
  route_table_id = "${aws_route_table.rtbPublic.id}"
  subnet_id = "${aws_subnet.subnetPublic2.id}"
}

resource "aws_route_table_association" "rtbaPublic3" {
  route_table_id = "${aws_route_table.rtbPublic.id}"
  subnet_id = "${aws_subnet.subnetPublic3.id}"
}

// Defines the public route to Anywhere through the Internet Gateway.
// Usages include:
// - Fargate task, docker pull to ECR, and PUT to Kinesis
// - NAT Gateway exterior traffic
resource "aws_route" "routeIgw" {
  destination_cidr_block = "0.0.0.0/0"
  gateway_id = "${aws_internet_gateway.igw.id}"
  route_table_id = "${aws_route_table.rtbPublic.id}"
}

resource "aws_internet_gateway" "igw" {
  tags = "${merge(var.globalTags, map("Name", "${var.project}-igw"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_eip" "eip1" {
  depends_on = ["aws_internet_gateway.igw"]
  tags = "${merge(var.globalTags, map("Name", "${var.project}-eip1"))}"
  vpc = true
}

// NAT Gateway allows private VPC resources to reach the internet.
// Usages include:
// - Lambda use of AWS JS SDK, i.e. cloudwatch.putMetricData.  Lambda cannot directly use an IGW.
resource "aws_nat_gateway" "nat1" {
  allocation_id = "${aws_eip.eip1.id}"
  subnet_id = "${aws_subnet.subnetPublic1.id}"
  tags = "${merge(var.globalTags, map("Name", "${var.project}-nat1"))}"
}

resource "aws_route_table" "rtbPrivate" {
  tags = "${merge(var.globalTags, map("Name", "${var.project}-rtbPrivate"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

// Main RTB is a Private RTB
resource "aws_main_route_table_association" "mainRtbAssoc" {
  route_table_id = "${aws_route_table.rtbPrivate.id}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_route_table_association" "rtbaPrivate1" {
  route_table_id = "${aws_route_table.rtbPrivate.id}"
  subnet_id = "${aws_subnet.subnetPrivate1.id}"
}

resource "aws_route_table_association" "rtbaPrivate2" {
  route_table_id = "${aws_route_table.rtbPrivate.id}"
  subnet_id = "${aws_subnet.subnetPrivate2.id}"
}

resource "aws_route_table_association" "rtbaPrivate3" {
  route_table_id = "${aws_route_table.rtbPrivate.id}"
  subnet_id = "${aws_subnet.subnetPrivate3.id}"
}

// Defines the private route to Anywhere through the NAT Gateway.
resource "aws_route" "routeNat" {
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id = "${aws_nat_gateway.nat1.id}"
  route_table_id = "${aws_route_table.rtbPrivate.id}"
}


resource "aws_security_group" "sgLambda" {
  name = "${var.project}-sgLambda"
  tags = "${merge(var.globalTags, map("Name", "${var.project}-sgLambda"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

// Lambda does not require ingress rules.

// Egress is simply the Lambda's invocation of cloudwatch.PutMetricData.
resource "aws_security_group_rule" "sgLambdaOutAnywhere" {
  cidr_blocks = ["0.0.0.0/0"]
  from_port = 0
  protocol = "all"
  security_group_id = "${aws_security_group.sgLambda.id}"
  to_port = 0
  type = "egress"
}

resource "aws_security_group" "sgRds" {
  name = "${var.project}-sgRds"
  tags = "${merge(var.globalTags, map("Name", "${var.project}-sgRds"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_security_group_rule" "sgRdsInVpc" {
  from_port = "${var.rdsPort}"
  protocol = "tcp"
  security_group_id = "${aws_security_group.sgRds.id}"
  source_security_group_id = "${aws_default_security_group.sgVpc.id}"
  to_port = "${var.rdsPort}"
  type = "ingress"
}

// For troubleshooting only.  Requires public subnet.
resource "aws_security_group_rule" "sgRdsInWhitelist" {
  count = "${var.whitelistEnabled ? 1 : 0}"
  cidr_blocks = "${var.whitelistCidr}"
  from_port = "${var.rdsPort}"
  protocol = "tcp"
  security_group_id = "${aws_security_group.sgRds.id}"
  to_port = "${var.rdsPort}"
  type = "ingress"
}

resource "aws_security_group_rule" "sgRdsOutAnywhere" {
  cidr_blocks = ["0.0.0.0/0"]
  from_port = 0
  protocol = "all"
  security_group_id = "${aws_security_group.sgRds.id}"
  to_port = 0
  type = "egress"
}

resource "aws_security_group" "sgTask" {
  name = "${var.project}-sgTask"
  tags = "${merge(var.globalTags, map("Name", "${var.project}-sgTask"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

// sgTask will have no ingress rule, the task does not need to accept unsolicited internet traffic.

resource "aws_security_group_rule" "sgTaskOutAnywhere" {
  cidr_blocks = ["0.0.0.0/0"]
  from_port = 0
  protocol = "all"
  security_group_id = "${aws_security_group.sgTask.id}"
  to_port = 0
  type = "egress"
}

resource "aws_default_security_group" "sgVpc" {
  egress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port = 0
    protocol = "-1"
    to_port = 0
  }
  ingress {
    from_port = 0
    protocol = -1
    self = true
    to_port = 0
  }
  dynamic "ingress" {
    for_each = "${var.whitelistEnabled ? list(var.whitelistCidr) : list()}"
    content {
      cidr_blocks = ingress.value // The value itself is also a list
      from_port = "${var.rdsPort}"
      protocol = "tcp"
      to_port = "${var.rdsPort}"
    }
  }
  tags = "${merge(var.globalTags, map("Name", "${var.project}-sgVpc"))}"
  vpc_id = "${aws_vpc.theVpc.id}"
}

resource "aws_vpc_dhcp_options" "dhcpOptionsSet" {
  domain_name = "${var.region}.compute.internal"
  domain_name_servers = [ "AmazonProvidedDNS" ]
  tags = "${merge(var.globalTags, map("Name", "${var.project}-dhcpOptionsSet"))}"
}

resource "aws_vpc_dhcp_options_association" "dhcpOptionsAssoc" {
  vpc_id = "${aws_vpc.theVpc.id}"
  dhcp_options_id = "${aws_vpc_dhcp_options.dhcpOptionsSet.id}"
}

output "subnetIdPublic1" {
  value = aws_subnet.subnetPublic1.id
}

output "subnetIdPublic2" {
  value = aws_subnet.subnetPublic2.id
}

output "subnetIdPublic3" {
  value = aws_subnet.subnetPublic3.id
}

output "subnetIdPrivate1" {
  value = aws_subnet.subnetPrivate1.id
}

output "subnetIdPrivate2" {
  value = aws_subnet.subnetPrivate2.id
}

output "subnetIdPrivate3" {
  value = aws_subnet.subnetPrivate3.id
}

output "sgLambdaId" {
  value = aws_security_group.sgLambda.id
}

output "sgRdsId" {
  value = aws_security_group.sgRds.id
}

output "sgVpcId" {
  value = aws_default_security_group.sgVpc.id
}

output "vpcId" {
  value = aws_vpc.theVpc.id
}
