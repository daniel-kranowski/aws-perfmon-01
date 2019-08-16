resource "aws_rds_cluster" "rdsCluster" {
  availability_zones = [ "${var.az1}", "${var.az2}", "${var.az3}" ]
  backup_retention_period = "${var.backupRetentionPeriod}"
  cluster_identifier = "${replace(lower(var.project), "_", "-")}-rdscluster" // uppercase chars and underscores not allowed in this arg value
  copy_tags_to_snapshot = "${var.copyTagsToSnapshot}"
  database_name = "${var.databaseName}"
  db_cluster_parameter_group_name = "${var.clusterParameterGroupName}"
  db_subnet_group_name = "${aws_db_subnet_group.dbSubnetGroup.name}"
  deletion_protection = "${var.deletionProtection}"
  engine = "${var.engine}"
  engine_version = "${var.engineVersion}"
  master_password = "${var.masterPassword}"
  master_username = "${var.masterUsername}"
  port = "${var.port}"
  preferred_backup_window = "${var.preferredBackupWindow}"
  skip_final_snapshot = "${var.skipFinalSnapshot}"
  storage_encrypted = "${var.storageEncrypted}"
  tags = "${var.globalTags}"
  vpc_security_group_ids = [ "${var.securityGroupId}" ]
}

resource "aws_db_subnet_group" "dbSubnetGroup" {
  name = "${lower(var.project)}-db_subnet_group" // uppercase chars not allowed in this arg value
  subnet_ids = [ "${var.subnetId1}", "${var.subnetId2}", "${var.subnetId3}" ]
  tags = "${var.globalTags}"
}

// RDS Enhanced Monitoring is enabled at the instance level, by setting monitoring_interval to a value greater than 0.
// RDS Performance Insights is enabled at the instance level, by setting performance_insights_enabled to true.
resource "aws_rds_cluster_instance" "rdsClusterInstance" {
  auto_minor_version_upgrade = "${var.autoMinorVersionUpgrade}"
  cluster_identifier = "${aws_rds_cluster.rdsCluster.cluster_identifier}"
  copy_tags_to_snapshot = "${var.copyTagsToSnapshot}"
  db_parameter_group_name = "${var.parameterGroupName}"
  db_subnet_group_name = "${aws_db_subnet_group.dbSubnetGroup.name}"
  engine = "${var.engine}"
  engine_version = "${var.engineVersion}"
  identifier = "${aws_rds_cluster.rdsCluster.cluster_identifier}instance"
  instance_class = "${var.instanceClass}"
  monitoring_interval = "${var.monitoringInterval}"
  monitoring_role_arn = "${aws_iam_role.rdsEnhancedMonitoringRole.arn}"
  performance_insights_enabled = "${var.performanceInsightsEnabled}"
  preferred_maintenance_window = "${var.preferredMaintenanceWindow}"
  publicly_accessible = "${var.publiclyAccessible}"
  tags = "${var.globalTags}"
}

/*
  In a production system we would declare additional cluster instances, i.e. read replicas.
*/

output "rdsClusterEndpoint" {
  value = aws_rds_cluster.rdsCluster.endpoint
}
