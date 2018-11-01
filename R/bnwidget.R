#' Bayesian Network visuallization.
#'
#' bnwidget is an htmlwidget for Bayesian Network visualization
#' @import htmlwidgets
#' @export

bnwidget <- function(nodes, 
                     links,
                     cpds,
                     linkDistance = 150,
                     opacity = 0.75,
                     charge = -10,
                     width = NULL, 
                     height = NULL) {
  
  
  # create a list that contains the settings
   settings <- list(
     linkDistance = linkDistance,
     opacity = opacity,
     charge = charge
   )
   # create links data
   links <- data.frame(source = links[,"from"],
                       target = links[,"to"])
   
   # create nodes data
   nodes <- data.frame(name = nodes, group = 1, width = 100, height = 50)

  # pass the data and settings using 'x'
  x <- list(
    nodes = nodes,
    links = links,
    cpds = cpds,
    settings = settings
  )
  # create the widget
  htmlwidgets::createWidget("bnwidget", x, width = width, height = height)
}

#' @export
bnwidgetOutput <- function(outputId, width = "100%", height = "400px") {
  shinyWidgetOutput(outputId, "bnwidget", width, height, package = "bnwidget")
}
#' @export
renderBnwidget <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, bnwidgetOutput, env, quoted = TRUE)
}
