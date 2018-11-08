#' Bayesian Network visuallization.
#'
#' bnwidget is an htmlwidget for Bayesian Network visualization
#' @import htmlwidgets
#' @export

bnwidget <- function(nodes, 
                     links,
                     cpds,
                     node_states = NULL,
                     marginal_probs = NULL,
                     evidence = NULL,
                     linkDistance = 200,
                     opacity = 0.75,
                     charge = 0,
                     width = 1000, 
                     height = 800) {
  
  
  # create a list that contains the settings
   settings <- list(
     linkDistance = linkDistance,
     opacity = opacity,
     charge = charge
   )
   # create links data
   links <- data.frame(source = links[,"from"],
                       target = links[,"to"])
   if(is.null(node_states))
   {
     node_states <- lapply(cpds, function(x) rownames(x))
   }
   # create nodes data
   nodes <- data.frame(name = nodes, group = 1, width = 150, height = 90)

  # pass the data and settings using 'x'
  x <- list(
    nodes = nodes,
    links = links,
    cpds = cpds,
    node_states = node_states,
    marginal_probs = marginal_probs,
    evidence = evidence,
    settings = settings
  )
  # create the widget
  htmlwidgets::createWidget("bnwidget", x, width = width, height = height)
}

#' @export
bnwidgetOutput <- function(outputId, width = "1000px", height = "800px") {
  shinyWidgetOutput(outputId, "bnwidget", width, height, package = "bnwidget")
}
#' @export
renderBnwidget <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, bnwidgetOutput, env, quoted = TRUE)
}
