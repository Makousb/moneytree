import { addToGoal, createGoal, listGoals } from "../db/queries/goals.js";
import { toBase } from "../services/fx.js";

export async function listGoalsPage(req, res, next) {
  try {
    const goals = await listGoals(req.session.user.id);
    res.render("goals", { title: "Savings Goals", goals });
  } catch (error) {
    next(error);
  }
}

export async function addGoal(req, res, next) {
  const name = (req.body.name || "").trim();
  const targetAmount = Number.parseFloat(req.body.targetAmount);

  if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    req.flash("error", "Give your goal a name and a target amount.");
    return res.redirect("/goals");
  }

  try {
    await createGoal({
      userId: req.session.user.id,
      name,
      targetAmount: toBase(req.session.user, targetAmount),
      targetDate: req.body.targetDate || null
    });

    req.flash("success", "Goal planted. Start growing it!");
    return res.redirect("/goals");
  } catch (error) {
    return next(error);
  }
}

export async function contributeToGoal(req, res, next) {
  const amount = Number.parseFloat(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    req.flash("error", "Enter a contribution greater than zero.");
    return res.redirect("/goals");
  }

  try {
    const goal = await addToGoal(
      Number(req.params.id),
      req.session.user.id,
      toBase(req.session.user, amount)
    );

    req.flash(
      goal ? "success" : "error",
      goal ? "Contribution added." : "Goal not found."
    );
    return res.redirect("/goals");
  } catch (error) {
    return next(error);
  }
}
