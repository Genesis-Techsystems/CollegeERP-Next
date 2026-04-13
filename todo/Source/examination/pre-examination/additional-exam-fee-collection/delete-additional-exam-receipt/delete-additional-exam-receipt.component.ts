import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-additional-exam-receipt',
  templateUrl: './delete-additional-exam-receipt.component.html',
  styleUrls: ['./delete-additional-exam-receipt.component.scss']
})

export class DeleteAdditionalExamReceiptComponent implements OnInit {

  StatusForm: FormGroup;

  constructor(private dialogRef: MatDialogRef<DeleteAdditionalExamReceiptComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data) { }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.StatusForm = this.formBuilder.group({
      reason: ['', Validators.required],
    });
  }

  submit(): void {
    const Obj = this.StatusForm.value;
    Obj.name = 'delete';
    if (this.StatusForm.invalid) {
      return;
    } else {
        this.dialogRef.close(Obj);
    }
  }

}
