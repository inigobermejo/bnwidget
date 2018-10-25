#' Bayesian Network visuallization.
#'
#' bnwidget is an htmlwidget for Bayesian Network visualization
#' @import htmlwidgets
#' @export

bnwidget <- function(nodes, links, cpds,
                  width = NULL, height = NULL) {
  
  # read the gexf file
  data <- paste(readLines(gexf), collapse="\n")
  
  # create a list that contains the settings
  # settings <- list()
  
  # pass the data and settings using 'x'
  x <- list(
    nodes = nodes,
    links = links,
    cpds = cpds
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
