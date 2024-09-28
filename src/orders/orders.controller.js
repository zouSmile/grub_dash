const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
const { stat } = require("fs");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: orders });
}

function bodyHasProperty(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function dishesAreNotEmpty(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length > 0) {
    return next();
  }
  next({ status: 400, message: "Order must include at least one dish" });
}

function quantityIsValid(req, res, next) {
  const { data: { dishes = [] } = {} } = req.body;
  for (let index = 0; index < dishes.length; index++) {
    const quantity = dishes[index].quantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return next({
        status: 400,
        message: `dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  next();
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    status: status,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}.`,
  });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  const { orderId } = req.params;
  const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const foundOrder = res.locals.order;
  if (id && orderId !== id) {
    return next({
        status: 400,
        message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
      });
  }
  if (status === "invalid") {
    return next({
        status: 400,
        message: `Invalid status`,
      });
  }
  
  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;
  res.json({ data: foundOrder });
}

function statusIsNotDeliverd(req, res, next) {
  const status = res.locals.order.status;
  if (status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }
  next();
}

function statusIsPending(req, res, next) {
  const status = res.locals.order.status;
  if (status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
  next();
}
function destroy(req, res, next) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  const deltedOrders = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    bodyHasProperty("deliverTo"),
    bodyHasProperty("mobileNumber"),
    bodyHasProperty("dishes"),
    dishesAreNotEmpty,
    quantityIsValid,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyHasProperty("deliverTo"),
    bodyHasProperty("mobileNumber"),
    bodyHasProperty("status"),
    bodyHasProperty("dishes"),
    dishesAreNotEmpty,
    quantityIsValid,
    statusIsNotDeliverd,
    update,
  ],
  delete: [orderExists, statusIsPending, destroy],
};
