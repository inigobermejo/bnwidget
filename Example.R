library(gRain)
library(bnlearn)
library(bnwidget)
library(devtools)



learning.data <-bnlearn::asia
bnclass <- bnlearn::hc(learning.data)
bnclass <- bnlearn::cextend(bnclass)
bnfit<-bnlearn::bn.fit(bnclass, learning.data)
probs <- lapply(bnfit, function(x) x$prob)
cpds<- lapply(bnfit, function(x) x$prob)
node_values <- lapply(cpds, function(x) rownames(x))
nodes <- bnlearn::nodes(bnclass)
links <- bnlearn::arcs(bnclass)
jtree = as.grain(bnfit)
marginal_probs = querygrain(jtree, nodes, type = "marginal")
jtree_a = setFinding(jtree, nodes = "A", states = "yes")
jtree_a_s = setFinding(jtree_a, nodes = "S", states = "no")

evidenz <-getEvidence(jtree_a_s)
jtree_ap = propagate(jtree_a)
marginal_probs_b = querygrain(jtree_ap)

marginal_probs_a_s = querygrain(jtree_a_s, nodes = nodes)

devtools::build()
devtools::install()
bnwidget(nodes, links, cpds, marginal_probs = marginal_probs)
  