import { nanoid } from "@reduxjs/toolkit";
import * as Yup from "yup";

//    BELOW WILL CREATE A NEW METHOD FOR YOU
Yup.addMethod(Yup.string, "oneWord", function () {
  return this.test(
    "one-word",
    `Field should not contain whitespace`,
    function (value) {
      const whitespaceIndex = value?.indexOf(" ");
      if (
        value &&
        whitespaceIndex > -1 &&
        whitespaceIndex != value.length - 1
      ) {
        return false;
      } else {
        return true;
      }
    }
  );
});

// Custom function to validate the card number using the Luhn Algorithm
Yup.addMethod(Yup.string, "validCard", function () {
  return this.test("validate-card", `Card number not valid`, function (number) {
    if (!Number(number)) return false;
    let sum = 0;
    let shouldDouble = false;

    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  });
});

Yup.addMethod(Yup.string, "strongPassword", function () {
  return this.test(
    "strong-pass",
    `Password must contain an uppercase, lowercase and a number`,
    function (value) {
      const strongRegex = new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})"
      );
      return strongRegex.test(value);
      // (?=.*[!@#\$%\^&\*])
    }
  );
});

const loginInitials = {
  username: "",
  password: "",
};

const registerInitials = {
  username: "",
  email: "",
  password: "",
};

export const registerInitialsPro = {
  username: "",
  email: "",
  password: "",
  token: "",
};

const editProfileSchema = Yup.object().shape({
  address: Yup.string().required().min(2).max(255).trim().label("Address"),
  lga: Yup.object()
    .shape({
      name: Yup.string().required().label("LGA").min(2).max(255).trim(),
      _id: Yup.string().optional(),
    })
    .required()
    .label("LGA"),

  class: Yup.object()
    .shape({
      name: Yup.string()
        .label("Class")
        .min(2)
        .max(255)
        .optional()
        .trim()
        .lowercase(),
      _id: Yup.string().optional(),
    })
    .optional()

    .label("Level"),
  firstName: Yup.string()
    .oneWord()
    .required()
    .min(2)
    .max(200)
    .trim()
    .label("First name"),
  lastName: Yup.string()
    .oneWord()
    .required()
    .min(2)
    .max(200)
    .trim()
    .label("Last name"),
  birthday: Yup.date().required().max(new Date()),
  gender: Yup.object()
    .shape({
      name: Yup.string()
        .optional()
        .label("Gender")
        .matches(
          /^male$|^female$/i,
          "Gender should either be a male or female "
        )
        .trim()
        .lowercase(),
      _id: Yup.string().optional(),
    })
    .optional()
    .label("Gender"),
  preffix: Yup.object()
    .shape({
      name: Yup.string().optional().label("Preffix"),
      _id: Yup.string().optional(),
    })
    .optional(),
  country: Yup.string().required().trim().lowercase(),
  contact: Yup.string().required(),
  state: Yup.object()
    .shape({
      name: Yup.string().required().label("State").trim().lowercase(),
      _id: Yup.string().optional(),
    })
    .required(),
});
export const validationSchemaRegisterPro = Yup.object().shape({
  username: Yup.string()
    .oneWord()
    .required()
    .min(4)
    .max(20)
    .trim()
    .label("Username"),
  token: Yup.string()
    .oneWord()
    .required()
    .min(4)
    .max(25)
    .trim()
    .label("Pro Token"),
  email: Yup.string()
    .email()
    .required()
    .trim("Whitespaces not allowed")
    .label("Email"),
  password: Yup.string().min(8).strongPassword().required().label("Password"),
});
const validationSchemaRegister = Yup.object().shape({
  username: Yup.string()
    .oneWord()
    .required()
    .min(4)
    .max(20)
    .trim()
    .label("Username"),
  email: Yup.string()
    .email()
    .required()
    .trim("Whitespaces not allowed")
    .label("Email"),
  password: Yup.string().min(8).strongPassword().required().label("Password"),
});

const validationSchemaLogin = Yup.object().shape({
  username: Yup.string()
    .oneWord()
    .required()
    .trim("Whitespaces not allowed")
    .label("Email or username")
    .min(4)
    .max(100),
  password: Yup.string().min(8).strongPassword().required().label("Password"),
});

export const subInitials = {
  // card_number: "",
  // card_number: "5531886652142950",
  // card_cvv: "",
  // card_cvv: "564",
  // card_exp_month: "",
  // card_exp_month: "09",
  // card_exp_year: "",
  // card_exp_year: "31",
  // otp: "",
  // pin: "",
  sub_amount: "",
  // flw_ref: "",
  // tx_ref: "",
};

export const withdrawInitials = {
  bank: { code: "044", name: "Access Bank" },
  acct_number: "0690000032",
};

export const renewInitials = {
  amount: "",
};

export const createSubjInitials = {
  name: "",
  categories: [],
  image: {},
};
export const createCatInitials = {
  name: "",
  _id: "",
  image: {},
};
export const createTopicInitials = {
  name: "",
  subject: "",
};

export const createQuestInitials = {
  question: "",
  subject: {},
  timer: 40,
  point: 40,
  topic: {},
  image: {},
  answers: [],
  categories: [],
  _id: "",
};

export const createNewQuestInitials = {
  question: "",
  timer: 40,
  point: 40,
  answers: [],
  image: {},
  _id: "",
};

export const createSchoolInitials = {
  name: "St. augustines college",
  state: { _id: "1", name: "kogi" },
  lga: { _id: "1", name: "kabba/bunu" },
  email: "st.augustines101@gmail.com",
  contact: "07036284939",
  type: { _id: "1", name: "private" },
  levels: [
    { id: "1", name: "junior secondary" },
    { id: "2", name: "senior secondary" },
  ],
};

export const createSchoolSchema = Yup.object().shape({
  name: Yup.string().required().label("School Name"),
  state: Yup.object()
    .shape({ name: Yup.string().required(), _id: Yup.string().optional() })
    .required()
    .label("School State"),
  lga: Yup.object()
    .shape({ name: Yup.string().required(), _id: Yup.string().optional() })
    .required()
    .label("School LGA"),
  type: Yup.object()
    .shape({ name: Yup.string().required(), _id: Yup.string().optional() })
    .required()
    .label("School Type"),
  email: Yup.string().email().required().label("School Email"),
  contact: Yup.string().required().label("School Contact"),
  levels: Yup.array()
    .min(1, "Add at least an educational level")
    .required()
    .label("School Levels"),
});

export const createCatSchema = Yup.object().shape({
  _id: Yup.string().optional().label("Category ID"),
  name: Yup.string().required().label("Category Name"),
  image: Yup.object().shape({
    uri: Yup.string().required().label("Cover Image"),
    width: Yup.number().optional().label("Cover Meta"),
    height: Yup.string().optional().label("Cover Meta"),
    type: Yup.string().default("image").label("Cover Meta"),
  }),
});

export const createTopicSchema = Yup.object().shape({
  subject: Yup.object()
    .shape({
      _id: Yup.string().required().label("Subject"),
      name: Yup.string().optional().label("Subject name"),
    })
    .required()
    .label("Subject"),
  name: Yup.string().required().label("Topic"),
});

export const createNewQuestSchema = Yup.object().shape({
  answers: Yup.array()
    .min(2, "Add at least two answers")
    .required()
    .label("Answers"),
  _id: Yup.string().optional().label("Question ID"),
  question: Yup.string().required().label("Question"),
  timer: Yup.number().default(40).label("Time"),
  point: Yup.number().default(50).label("Point"),
  image: Yup.object()
    .shape({
      uri: Yup.string().optional().label("Cover Image"),
      width: Yup.number().optional().label("Cover Meta"),
      height: Yup.string().optional().label("Cover Meta"),
      type: Yup.string().default("image").label("Cover Meta"),
    })
    .optional(),
});

export const createQuestSchema = Yup.object().shape({
  categories: Yup.array()
    .min(1, "Add at least a category")
    .required()
    .label("Categories"),
  answers: Yup.array()
    .min(2, "Add at least two answers")
    .required()
    .label("Answers"),
  topic: Yup.object()
    .shape({
      name: Yup.string().optional(),
      _id: Yup.string().required().label("Topic"),
    })
    .required()
    .label("Topic"),
  subject: Yup.object()
    .shape({
      name: Yup.string().optional(),
      _id: Yup.string().required().label("Subject"),
    })
    .required()
    .label("Subject"),
  question: Yup.string().required().label("Question"),
  _id: Yup.string().optional().label("Question ID"),
  timer: Yup.number().default(40).label("Time"),
  point: Yup.number().default(50).label("Point"),
  image: Yup.object()
    .shape({
      uri: Yup.string().optional().label("Cover Image"),
      width: Yup.number().optional().label("Cover Meta"),
      height: Yup.string().optional().label("Cover Meta"),
      type: Yup.string().default("image").label("Cover Meta"),
    })
    .optional(),
});

export const createSubjSchema = Yup.object().shape({
  categories: Yup.array()
    .min(1, "Add at least a category")
    .required()
    .label("Categories"),
  name: Yup.string().required().label("Subject Name"),
  image: Yup.object().shape({
    uri: Yup.string().required().label("Cover Image"),
    width: Yup.number().optional().label("Cover Meta"),
    height: Yup.string().optional().label("Cover Meta"),
    type: Yup.string().default("image").label("Cover Meta"),
  }),
});

export const withdrawPointsSchema = Yup.object().shape({
  bank: Yup.object().shape({
    code: Yup.string().label("Bank code").optional(),
    name: Yup.string().label("Bank name").required(),
  }),
  acct_number: Yup.string()
    .required()
    .matches(/^\d{10}$/, "Account number must be exactly 10 digits")
    .label("Account number"),
});

export const renewSubsSchema = Yup.object().shape({
  amount: Yup.object()
    .shape({
      name: Yup.string().optional().label("Amount"),
      value: Yup.string().required().label("Amount"),
      title: Yup.string().optional().label("Amount"),
      _id: Yup.string().optional(),
    })
    .required()
    .label("Subscription Amount"),
});

export const buyDataInitials = {
  network: "MTN",
  phoneNumber: "",
  bundle: {},
};

export const buyDataSchema = Yup.object().shape({
  network: Yup.string().required().label("Network"),
  phoneNumber: Yup.string().required().label("Phone Number"),
  bundle: Yup.object()
    .shape({
      name: Yup.string().optional().label("Bundle Name"),
      billerCode: Yup.string().required().label("Bundle Plan"),
      id: Yup.string().optional(),
      itemCode: Yup.string().optional(),
      amount: Yup.string().optional(),
      description: Yup.string().optional(),
      points: Yup.string().optional(),
      validity: Yup.string().optional(),
      value: Yup.string().optional(),
    })
    .required()
    .label("Data Bundle"),
});

export const subUserSchema = Yup.object().shape({
  sub_amount: Yup.object()
    .shape({
      name: Yup.string().optional().label("Amount"),
      value: Yup.string().required().label("Amount"),
      _id: Yup.string().optional(),
    })
    .required()
    .label("Amount"),
});

export const newClassInitials = {
  name: "",
  class: { name: "", _id: "" },
};

export const newClassSchema = Yup.object().shape({
  name: Yup.string().required().label("Class Name"),
  class: Yup.object()
    .shape({
      name: Yup.string().required().label("Class"),
      _id: Yup.string().optional(),
    })
    .required()
    .label("Class Level"),
});

export const newAssignmentInitials = {
  subject: {},
  classes: [],
  title: "",
  question: "",
  date: "",
};

export const newAssignmentSchema = Yup.object().shape({
  subject: Yup.object()
    .shape({
      name: Yup.string().optional(),
      _id: Yup.string().required().label("Subject ID"),
    })
    .required()
    .label("Subject"),
  title: Yup.string().required().label("Assignment Title"),
  question: Yup.string().required().label("Assignment Question"),
  date: Yup.string().required().label("Date of Submission"),
  classes: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().required().label("Class"),
        _id: Yup.string().optional(),
      })
    )
    .required()
    .min(1, "Add at least a class")
    .label("Classes"),
});

export const newAnnouncementInitials = {
  classes: [],
  title: "",
};

export const newAnnouncementSchema = Yup.object().shape({
  title: Yup.string().required().label("Announcement"),
  classes: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().lowercase().required().label("Class Level"),
        _id: Yup.string().optional(),
      })
    )
    .required()
    .min(1, "Add at least a class")
    .label("Classes"),
});

export const newQuizInitials = {
  subject: {},
  class: {},
  title: "",
  // end_date: "",
  // questions: [],
};

export const newQuizSchema = Yup.object().shape({
  subject: Yup.object()
    .shape({
      name: Yup.string().lowercase().optional(),
      _id: Yup.string().required().label("Subject"),
    })
    .required()
    .label("Subject"),
  class: Yup.object()
    .shape({
      name: Yup.string().lowercase().optional(),
      _id: Yup.string().required().label("Class"),
    })
    .required()
    .label("Class"),
  title: Yup.string().required().label("Title"),
  // end_date: Yup.string().required().label("End Date"),
  // questions: Yup.array()
  //   .required()
  //   .min(1, "Add at least a question")
  //   .label("Questions"),
});

export const editQuestInitials = {
  subject: "",
  topic: "",
};

export const proSubjectInitials = {
  subjects: [],
};

export const proSubjectSchema = Yup.object().shape({
  subjects: Yup.array()
    .of(
      Yup.object()
        .shape({
          name: Yup.string().lowercase().optional(),
          _id: Yup.string().required().label("Subject"),
        })
        .required()
        .label("Subject")
    )
    .min(1, "Add at least a subject")
    .label("Subjects"),
});

export const editQuestSchema = Yup.object().shape({
  subject: Yup.object()
    .shape({
      name: Yup.string().lowercase().optional(),
      _id: Yup.string().required().label("Subject"),
    })
    .required()
    .label("Subject"),
  topic: Yup.object()
    .shape({
      name: Yup.string().optional(),
      _id: Yup.string().optional().label("Topic"),
    })
    .optional()
    .label("Topic"),
});

export const editTopicInitials = {
  subject: "",
};

export const editTopicSchema = Yup.object().shape({
  subject: Yup.object()
    .shape({
      name: Yup.string().lowercase().optional(),
      _id: Yup.string().required().label("Subject"),
    })
    .required()
    .label("Subject"),
});

export default {
  validationSchemaLogin,
  validationSchemaRegister,
  editProfileSchema,
  loginInitials,
  registerInitials,
};
