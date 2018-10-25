HTMLWidgets.widget({

  name: "bnwidget",

  type: "output",
    
  initialize: function(el, width, height) {
    svg = d3.select(el).append("svg")
    .attr("width", width)
    .attr("height", height);
     
    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000');

    // init D3 force layout
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .attr('fill', '#000');
    
    // init D3 drag support
    return d3.forceSimulation();
  },
  
    resize: function(el, width, height, force) {
    
    d3.select(el).select("svg")
        .attr("width", width)
        .attr("height", height);

    force.force("center", d3.forceCenter(width / 2, height / 2))
        .restart();
  },

  renderValue: function(el, x, force) {
        
    // convert links and nodes data frames to d3 friendly format
    var links = HTMLWidgets.dataframeToD3(x.links);
    var nodes = HTMLWidgets.dataframeToD3(x.nodes);
    var cpds = HTMLWidgets.dataframeToD3(x.cpds);
    
    force
      .nodes(d3.values(nodes)).force('link', d3.forceLink().id((d) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('x', d3.forceX(width / 2))
      .force('y', d3.forceY(height / 2))
      .on('tick', tick);
    
    force.alpha(1).restart();
    
    // select the svg element
    var svg = d3.select(el).select("svg");
    
    // listen to mouse events
    svg.on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
      
    // line displayed when dragging new nodes
   const dragLine = svg.append('svg:path')
                       .attr('class', 'link dragline hidden')
                       .attr('d', 'M0,0L0,0');
  
    var bajsNet = new bajsianNetwork(links, nodes, cpds)
    
    // handles to link and node element groups
    let linkElements = svg.append('svg:g').selectAll('path');
    let nodeElements = svg.append('svg:g').selectAll('g');

    // mouse event vars
    let selectedNode = null;
    let selectedLink = null;
    let mousedownLink = null;
    let mousedownNode = null;
    let mouseupNode = null;

    function resetMouseVars() {
      mousedownNode = null;
      mouseupNode = null;
      mousedownLink = null;
    }

    // update force layout (called automatically each iteration)
    function tick() {
      // draw links with proper padding
      linkElements.attr('d', (d) => {
        sourceX = d.source.x + d.source.width / 2;
        sourceY = d.source.y + d.source.height / 2;
        targetX = d.target.x + d.target.width / 2;
        targetY = d.target.y + d.target.height / 2;
      
        [sourceX, sourceY] = intersectPointRect(targetX, targetY, sourceX, sourceY, d.source.width, d.source.height);
        [targetX, targetY] = intersectPointRect(sourceX, sourceY, targetX, targetY, d.target.width, d.target.height);

        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
      });
      // draw nodes
      nodElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
    }
        // app starts here
    svg.on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
    d3.select(window)
      .on('keydown', keydown)
      .on('keyup', keyup);
    restart();

    // update graph (called when needed)
    function restart() {
      // path (link) group
      path = path.data(links);

      // update existing links
      path.classed('selected', (d) => d === selectedLink)
        .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
        .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '');

      // remove old links
      path.exit().remove();

      // add new links
      path = path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', (d) => d === selectedLink)
        .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
        .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
        .on('mousedown', (d) => {
          if (d3.event.ctrlKey) return;

          // select link
          mousedownLink = d;
          selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
          selectedNode = null;
          restart();
        })
        .merge(path);

      // NB: the function arg is crucial here! nodes are known by id, not by index!
      nodeElements = nodeElements.data(nodes, (d) => d.id);

      // update existing nodes (reflexive & selected visual states)
      nodeElements.selectAll('rect')
        .style('fill', (d) => (d === selectedNode) ? d3.rgb('#F2D398').brighter().toString() : '#F2D398')

      // remove old nodes
      nodeElements.exit().remove();

      // add new nodes
      var g = nodeElements.enter().append('svg:g');

      g.append('svg:rect')
        .attr('class', 'node')
        .attr('width', 100)
        .attr('height', 50)
        .attr('rx', 5)
        .attr('ry', 5)
        .style('fill', (d) => (d === selectedNode) ? d3.rgb('#F2D398').brighter().toString() : '#F2D398')
        .style('stroke', (d) => d3.rgb(colors('#F2D398')).darker().toString())
        .on('mouseover', function (d) {
          if (!mousedownNode || d === mousedownNode) return;
          // enlarge target node
          d3.select(this).attr('transform', 'scale(1.1)');
        })
        .on('mouseout', function (d) {
          if (!mousedownNode || d === mousedownNode) return;
          // unenlarge target node
          d3.select(this).attr('transform', '');
        })
        .on('mousedown', (d) => {
          if (d3.event.ctrlKey) return;

          // select node
          mousedownNode = d;
          selectedNode = (mousedownNode === selectedNode) ? null : mousedownNode;
          selectedLink = null;

          // reposition drag line
          mousedownNodeX = mousedownNode.x + mousedownNode.width / 2;
          mousedownNodeY = mousedownNode.y + mousedownNode.height / 2;
          dragLine
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', `M${mousedownNodeX},${mousedownNodeY}L${mousedownNodeX},${mousedownNodeY}`);

          restart();
        })
        .on('mouseup', function (d) {
          if (!mousedownNode) return;

          // needed by FF
          dragLine
            .classed('hidden', true)
            .style('marker-end', '');

          // check for drag-to-self
          mouseupNode = d;
          if (mouseupNode === mousedownNode) {
            resetMouseVars();
            return;
          }

          // unenlarge target node
          d3.select(this).attr('transform', '');

          // add link to graph (update if exists)
\         var source = mousedownNode;
          var target = mouseupNode;

          var link = links.filter((l) => l.source === source && l.target === target)[0];
          if (!link) {
            links.push({ source, target, left: !isRight, right: isRight });
          }

          // select new link
          selectedLink = link;
          selectedNode = null;
          restart();
        });

      // show node IDs
      g.append('svg:text')
        .attr('x', 50)
        .attr('y', 30)
        .attr('class', 'id')
        .text((d) => `Node ${d.id}`);

      nodeElements = g.merge(nodeElements);

      // set the graph in motion
      force
        .nodes(nodes)
        .force('link').links(links);

      force.alphaTarget(0.3).restart();
    }

    function mousedown() {
      // because :active only works in WebKit?
      svg.classed('active', true);

      if (mousedownNode || mousedownLink) return;

      if(d3.event.ctrlKey) {
        // insert new node at point
        const point = d3.mouse(this);
        const node = { id: ++lastNodeId, x: point[0], y: point[1], width: node_width, height: node_height };
        nodes.push(node);
        }

      restart();
    }

    function mousemove() {
      if (!mousedownNode) return;

      xx = mousedownNode.x + mousedownNode.width / 2;
      yy = mousedownNode.y + mousedownNode.height / 2;
      // update drag line
      dragLine.attr('d', `M${xx},${yy}L${d3.mouse(this)[0]},${d3.mouse(this)[1]}`);

      restart();
    }

    function mouseup() {
      if (mousedownNode) {
        // hide drag line
        dragLine
          .classed('hidden', true)
          .style('marker-end', '');
      }

      // because :active only works in WebKit?
      svg.classed('active', false);

      // clear mouse event vars
      resetMouseVars();
    }
    
    
    // Returns intersection point between the line starting at pointX, pointY and a
    // rectangle centered at (rectX, rectY) with height rectH and width rectW
    function intersectPointRect(pointX, pointY, rectX, rectY, rectW, rectH) {
      s = (pointY - rectY)/(pointX - rectX);
      [x, y] = [pointX, pointY];
      if(-rectH/2 <= s * rectW/2 && s * rectW/2 <= rectH/2) { // then the line intersects
        if(pointX > rectX) // The right edge
        {
         x = rectX + rectW/2;
         y = rectY + s * rectW/2;
        }
        else // the left edge
        {
         x = rectX - rectW/2;
         y = rectY - s * rectW/2;
        }
      }
      if(-rectW/2 <= (rectH/2)/s && (rectH/2)/s <= rectW/2) // then the line intersects
      {
        if(pointY > rectY) // The top edge
        {
           y = rectY + rectH/2;
         x = rectX + (rectH/2)/s;
        }
        else // the bottom edge
        {
         y = rectY - rectH/2;
         x = rectX - (rectH/2)/s;
        }
      }
      // if the point is inside the rectangle, return pointX and pointY
      return [x, y];
    }
  
  },  
});
