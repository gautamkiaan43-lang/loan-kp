const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Identity access suspended. Contact system administrator.' });
    }

    let companyDivisions = [];
    if (user.company) {
      const companyObj = await prisma.company.findUnique({
        where: { name: user.company }
      });
      if (companyObj && companyObj.divisions) {
        companyDivisions = typeof companyObj.divisions === 'string' 
          ? JSON.parse(companyObj.divisions) 
          : companyObj.divisions;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        avatarUrl: user.avatarUrl,
        companyDivisions: Array.isArray(companyDivisions) ? companyDivisions : []
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let companyDivisions = [];
    if (user.company) {
      const companyObj = await prisma.company.findUnique({
        where: { name: user.company }
      });
      if (companyObj && companyObj.divisions) {
        companyDivisions = typeof companyObj.divisions === 'string' 
          ? JSON.parse(companyObj.divisions) 
          : companyObj.divisions;
      }
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        avatarUrl: user.avatarUrl,
        companyDivisions: Array.isArray(companyDivisions) ? companyDivisions : []
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCompanyConfig = async (req, res) => {
  const { name } = req.params;
  try {
    const comp = await prisma.company.findUnique({
      where: { name }
    });
    if (!comp) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json({
      discountAmount: comp.discountAmount || 0,
      discountRate:   comp.discountRate   || 0,
      address:        comp.address        || null,
      contactPeople:  comp.contactPeople  || null,
    });
  } catch (error) {
    console.error('getCompanyConfig Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
