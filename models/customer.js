/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map((c) => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get list of customers that match search */

  static async search(term) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       WHERE LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1
       ORDER BY last_name, first_name`,
      [`%${term.toLowerCase()}%`]
    );
    return results.rows.map((c) => new Customer(c));
  }

  /** get list of top 10 customers with most reservations */

  static async topTen() {
    const results = await db.query(
      `SELECT c.id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         c.notes, 
         count(*) AS reservations
         FROM customers c JOIN reservations ON c.id = customer_id 
         GROUP BY c.id ORDER BY reservations DESC LIMIT 10`
    );
    let customers = results.rows.map((c) => new Customer(c));
    for (let customer of customers) {
      customer["reservations"] = await customer.getReservations();
    }
    return customers;
    // ?? calling await within a map a no no ??

    //   const customers = results.rows.map(async function(c) { 
    //     let customer = new Customer(c);
    //     customer['reservations'] = await customer.getReservations();
    //     return customer;
    // //  });
    //  return customers;
  }

  /** get full name for this customer. */

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }
}

module.exports = Customer;
