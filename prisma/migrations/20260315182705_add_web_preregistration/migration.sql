-- CreateTable
CREATE TABLE "web_user_preregistration" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "fullName" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "email" TEXT,
    "state" TEXT,
    "city" TEXT,
    "areaPincode" TEXT,
    "aboutYourself" TEXT,
    "taste" TEXT,
    "lookingFor" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_user_preregistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_kitchen_preregistration" (
    "id" TEXT NOT NULL,
    "kitchenName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "email" TEXT,
    "vendorType" TEXT,
    "avgMealPrice" TEXT,
    "state" TEXT,
    "city" TEXT,
    "fssaiStatus" TEXT,
    "fssaiLicenseNo" TEXT,
    "gstNumber" TEXT,
    "deliveryCapability" TEXT,
    "serviceTiming" TEXT[],
    "interestedInReels" BOOLEAN NOT NULL DEFAULT false,
    "whyJoinFreshbhoj" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_kitchen_preregistration_pkey" PRIMARY KEY ("id")
);
