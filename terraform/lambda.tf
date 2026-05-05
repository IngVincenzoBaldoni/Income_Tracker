locals {
  lambda_functions = {
    "auth-signup"          = { handler = "index.handler", description = "User signup" }
    "auth-login"           = { handler = "index.handler", description = "User login" }
    "auth-confirm"         = { handler = "index.handler", description = "Confirm email" }
    "auth-change-password" = { handler = "index.handler", description = "Change password" }
    "user-get"             = { handler = "index.handler", description = "Get user info" }
    "jobs-create"          = { handler = "index.handler", description = "Create job entry" }
    "jobs-list"            = { handler = "index.handler", description = "List job entries" }
    "jobs-update"          = { handler = "index.handler", description = "Update job entry" }
    "jobs-delete"          = { handler = "index.handler", description = "Delete job entry" }
    "dashboard-metrics"    = { handler = "index.handler", description = "Dashboard metrics" }
  }

  lambda_env_vars = {
    DB_HOST              = aws_db_instance.main.address
    DB_PORT              = tostring(aws_db_instance.main.port)
    DB_USER              = var.db_username
    DB_PASSWORD          = var.db_password
    DB_NAME              = var.db_name
    COGNITO_REGION       = var.region
    COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
    COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.web.id
    NODE_ENV             = var.environment
  }

  # Path to the pre-built zip directory produced by backend/scripts/build-lambdas.sh.
  # Run `make build-lambdas` (or `make plan` which calls it automatically) before apply.
  lambda_build_dir = "${path.module}/../backend/.lambda_build"
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name = "${local.name_prefix}-${each.key}"
  description   = each.value.description
  role          = aws_iam_role.lambda_exec.arn
  handler       = each.value.handler
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  # Zips are produced by backend/scripts/build-lambdas.sh.
  # Each zip contains index.js + node_modules (pg, aws-sdk) at the root.
  filename         = "${local.lambda_build_dir}/${each.key}.zip"
  source_code_hash = filebase64sha256("${local.lambda_build_dir}/${each.key}.zip")

  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env_vars
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-${each.key}"
  })
}

output "lambda_function_arns" {
  value = { for k, v in aws_lambda_function.functions : k => v.arn }
}
