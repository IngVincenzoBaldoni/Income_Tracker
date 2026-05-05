resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.name_prefix}-api"
  description = "Career Tracker REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# ─── Helper locals ────────────────────────────────────────────────────────────
locals {
  api_id            = aws_api_gateway_rest_api.main.id
  api_root_id       = aws_api_gateway_rest_api.main.root_resource_id
  api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
}

# ─── Resources ────────────────────────────────────────────────────────────────
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = local.api_id
  parent_id   = local.api_root_id
  path_part   = "auth"
}

resource "aws_api_gateway_resource" "auth_signup" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "signup"
}

resource "aws_api_gateway_resource" "auth_login" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "login"
}

resource "aws_api_gateway_resource" "auth_confirm" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "confirm"
}

resource "aws_api_gateway_resource" "auth_password" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "password"
}

resource "aws_api_gateway_resource" "user" {
  rest_api_id = local.api_id
  parent_id   = local.api_root_id
  path_part   = "user"
}

resource "aws_api_gateway_resource" "jobs" {
  rest_api_id = local.api_id
  parent_id   = local.api_root_id
  path_part   = "jobs"
}

resource "aws_api_gateway_resource" "jobs_id" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.jobs.id
  path_part   = "{jobId}"
}

resource "aws_api_gateway_resource" "dashboard" {
  rest_api_id = local.api_id
  parent_id   = local.api_root_id
  path_part   = "dashboard"
}

resource "aws_api_gateway_resource" "dashboard_metrics" {
  rest_api_id = local.api_id
  parent_id   = aws_api_gateway_resource.dashboard.id
  path_part   = "metrics"
}

# ─── Lambda routes ────────────────────────────────────────────────────────────
module "route_auth_signup" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.auth_signup.id
  http_method       = "POST"
  lambda_invoke_arn = aws_lambda_function.functions["auth-signup"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["auth-signup"].function_name
}

module "route_auth_login" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.auth_login.id
  http_method       = "POST"
  lambda_invoke_arn = aws_lambda_function.functions["auth-login"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["auth-login"].function_name
}

module "route_auth_confirm" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.auth_confirm.id
  http_method       = "POST"
  lambda_invoke_arn = aws_lambda_function.functions["auth-confirm"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["auth-confirm"].function_name
}

module "route_auth_password" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.auth_password.id
  http_method       = "PUT"
  lambda_invoke_arn = aws_lambda_function.functions["auth-change-password"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["auth-change-password"].function_name
}

module "route_user_get" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.user.id
  http_method       = "GET"
  lambda_invoke_arn = aws_lambda_function.functions["user-get"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["user-get"].function_name
}

module "route_jobs_create" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.jobs.id
  http_method       = "POST"
  lambda_invoke_arn = aws_lambda_function.functions["jobs-create"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["jobs-create"].function_name
}

module "route_jobs_list" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.jobs.id
  http_method       = "GET"
  lambda_invoke_arn = aws_lambda_function.functions["jobs-list"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["jobs-list"].function_name
}

module "route_jobs_update" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.jobs_id.id
  http_method       = "PUT"
  lambda_invoke_arn = aws_lambda_function.functions["jobs-update"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["jobs-update"].function_name
}

module "route_jobs_delete" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.jobs_id.id
  http_method       = "DELETE"
  lambda_invoke_arn = aws_lambda_function.functions["jobs-delete"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["jobs-delete"].function_name
}

module "route_dashboard_metrics" {
  source            = "./modules/api_route"
  rest_api_id       = local.api_id
  resource_id       = aws_api_gateway_resource.dashboard_metrics.id
  http_method       = "GET"
  lambda_invoke_arn = aws_lambda_function.functions["dashboard-metrics"].invoke_arn
  execution_arn     = local.api_execution_arn
  function_name     = aws_lambda_function.functions["dashboard-metrics"].function_name
}

# ─── CORS OPTIONS — one per resource (not per method) ────────────────────────
locals {
  cors_resources = {
    auth_signup        = aws_api_gateway_resource.auth_signup.id
    auth_login         = aws_api_gateway_resource.auth_login.id
    auth_confirm       = aws_api_gateway_resource.auth_confirm.id
    auth_password      = aws_api_gateway_resource.auth_password.id
    user               = aws_api_gateway_resource.user.id
    jobs               = aws_api_gateway_resource.jobs.id
    jobs_id            = aws_api_gateway_resource.jobs_id.id
    dashboard_metrics  = aws_api_gateway_resource.dashboard_metrics.id
  }
}

resource "aws_api_gateway_method" "cors_options" {
  for_each = local.cors_resources

  rest_api_id   = local.api_id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_options" {
  for_each = local.cors_resources

  rest_api_id = local.api_id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors_options_200" {
  for_each = local.cors_resources

  rest_api_id = local.api_id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "cors_options" {
  for_each = local.cors_resources

  rest_api_id = local.api_id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors_options[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.cors_options,
    aws_api_gateway_method_response.cors_options_200,
  ]
}

# ─── CORS on Gateway-level error responses (4xx/5xx) ─────────────────────────
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = local.api_id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = local.api_id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
  }
}

# ─── Deployment ───────────────────────────────────────────────────────────────
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = local.api_id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.auth.id,
      aws_api_gateway_resource.jobs.id,
      aws_api_gateway_resource.dashboard.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    module.route_auth_signup,
    module.route_auth_login,
    module.route_auth_confirm,
    module.route_auth_password,
    module.route_user_get,
    module.route_jobs_create,
    module.route_jobs_list,
    module.route_jobs_update,
    module.route_jobs_delete,
    module.route_dashboard_metrics,
    aws_api_gateway_integration_response.cors_options,
  ]
}

resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = local.api_id
  stage_name    = var.environment

  tags = local.common_tags
}

output "api_endpoint_url" {
  value = aws_api_gateway_stage.dev.invoke_url
}
