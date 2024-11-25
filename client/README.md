# https://students.cs.niu.edu/~z1903083/Product-System

# Product System - Problem Statement
As a group of software engineers with a company that sells auto parts via a catalog and mail order, you are tasked to build a new system that enables Internet customers to place and pay for orders online. The system will handle credit card payment, assist in packing and shipping of the order, and keep inventory.

Internet customers will be presented with a custom ordering program that allows them to select products from a catalog. Each product is displayed with its name, description, picture, price and available quantity. The customer can order products with differing quantities. The system computes the total price, adds shipping and handling charge. Customers then provide their name, email, mailing address and credit card information to finalize the order. Once the credit card is authorized the order is complete and ready for packing and shipping. An email is sent to the customer confirming the order.

The company already maintains a legacy product database which contains the part number, description, weight, picture link and price for all products it offers. The new system has to interface with this database (details provided later). A suitable database system has to be selected for additionally needed information: such as quantity on hand for each product, and customer orders.

Credit card authorization is done via an interface to a credit card processing system which requires the credit card number, expiration date and purchase amount. The processing system confirms with an authorization number (details provided later).

A second interface to the new system will run on workstations in the warehouse: there workers can print packing lists for completed orders, retrieve the items from the warehouse, package them up, add an invoice and shipping label (both printed with the new system). Successful packing and shipping completes the order and is recorded in the order status. An email is sent to the customer confirming that the order has shipped.

A third interface also runs in the warehouse, at the receiving desk. Whenever products are delivered they are added to the inventory: they can be recognized by their description or part number. Their quantity on hand is updated. Note that the legacy product database does not contain inventory information.

And lastly, there will be an administrative interface that allows to set the shipping and handling charges, as well as view all orders. Shipping and handling charges are based on the weight of a complete order. This interface allows to set the weight brackets and their charges. Orders can be searched based on date range, status (authorized, shipped) or prize range. The complete order detail is displayed for a selected order.

[Frontend Documentation](./frontend/frontend.md)

[Backend Documentation](./backend/backend.md)

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
